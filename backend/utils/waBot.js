import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs-extra";
import qrcode from "qrcode";

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let lastQR = null;
let isConnected = false;
let connectedUser = null;
let connectionState = "disconnected"; // disconnected, connecting, connected, logged_out
let authPath = path.join(process.cwd(), "whatsapp_auth");

// Ensure auth directory exists
fs.ensureDirSync(authPath);

export async function connectToWhatsApp() {
  if (sock && connectionState === "connected") {
    return sock;
  }

  try {
    connectionState = "connecting";

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp] Using version: ${version.join(".")}, isLatest: ${isLatest}`);

    const loggerWA = pino({ level: "silent" });
    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore({ ...proto }, loggerWA),
      },
      logger: loggerWA,
      browser: [process.env.COMPANY_SHORT_NAME ? `${process.env.COMPANY_SHORT_NAME} ERP Bot` : "ERP Bot", "Chrome", "1.0.0"],
      generateHighQualityLinkPreview: false,
      patchMessageBeforeSending: (msg) => msg,
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        lastQR = qr;
        connectionState = "connecting";
        console.log("\n📱📱📱 SCAN THIS QR CODE WITH WHATSAPP 📱📱📱");
        qrcode.generate(qr, { small: true });
        console.log("\n📱 Scan the QR code above with your WhatsApp app\n");
      }

      if (connection === "close") {
        isConnected = false;
        connectedUser = null;
        lastQR = null;
        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output.statusCode
            : 500;

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        const isRestartRequired = statusCode === 515;

        console.log(`\n🔴 Connection closed. Status code: ${statusCode}, Should reconnect: ${shouldReconnect}\n`);

        if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          connectionState = "connecting";
          console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          setTimeout(() => connectToWhatsApp(), 1000 * reconnectAttempts);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          connectionState = "disconnected";
          console.log("❌ Max reconnection attempts reached. Please restart manually.");
        } else {
          connectionState = "logged_out";
          console.log("🔴 Logged out. Clearing auth state and restarting...");
          try {
            await fs.remove(authPath);
            fs.ensureDirSync(authPath);
          } catch (e) {
            console.error("Error clearing auth:", e);
          }
          reconnectAttempts = 0;
          setTimeout(() => connectToWhatsApp(), 2000);
        }
      }

      if (connection === "open") {
        isConnected = true;
        connectionState = "connected";
        lastQR = null;
        connectedUser = {
          id: sock.user.id,
          name: sock.user.name,
          number: sock.user.id.split(":")[0],
        };
        console.log("\n" + "✅".repeat(50));
        console.log(`✅✅✅ ${process.env.COMPANY_NAME || "ERP"} WHATSAPP BOT IS ONLINE ✅✅✅`);
        console.log("✅".repeat(50));
        console.log(`📱 Connected as: ${sock.user?.id} (${sock.user?.name || "Unknown"})`);

        // Fetch and log group list for easier configuration
        try {
          const groups = await sock.groupFetchAllParticipating();
          const groupList = Object.values(groups);
          if (groupList.length > 0) {
            console.log("\n👥 PARTICIPATING GROUPS:");
            groupList.forEach(g => {
              console.log(`👉 ${g.subject} | JID: ${g.id}`);
            });
            console.log("");
          } else {
            console.log("\n👥 No participating groups found. Please invite the bot to a group.");
          }
        } catch (err) {
          console.log("Error fetching groups:", err.message);
        }

        console.log("✅".repeat(50) + "\n");
        reconnectAttempts = 0;
      }
    });

    sock.ev.on("creds.update", saveCreds);

    // Listen to messages for logging (optional)
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      // Messages are handled but we don't store them to avoid DB burden
      // Uncomment below if you want to process incoming messages
    });

    return sock;
  } catch (error) {
    console.error("❌ Error connecting to WhatsApp:", error.message);
    connectionState = "disconnected";
    setTimeout(() => connectToWhatsApp(), 5000);
  }
}

export const getSock = () => sock;

export const getWhatsAppStatus = () => ({
  isConnected,
  connectionState,
  qr: lastQR,
  user: connectedUser,
});

// Generate QR code as base64 image for frontend
export async function getQRCodeBase64() {
  if (!lastQR) return null;
  try {
    return await qrcode.toDataURL(lastQR, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (error) {
    console.error("Error generating QR base64:", error);
    return null;
  }
}

export async function fetchGroups() {
  if (!sock || !isConnected) {
    return { success: false, message: "WhatsApp not connected" };
  }
  try {
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups).map(g => ({
      id: g.id,
      name: g.subject,
      participants: g.participants?.length || 0,
      isOwner: g.owner?.endsWith(sock.user.id) || false,
    })).sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, groups: groupList };
  } catch (error) {
    console.error("Error fetching groups:", error);
    return { success: false, message: error.message };
  }
}

export async function logoutWhatsApp() {
  try {
    if (sock) {
      await sock.logout();
      sock.end();
      sock = null;
    }
    isConnected = false;
    connectedUser = null;
    lastQR = null;
    connectionState = "disconnected";
    reconnectAttempts = 0;

    // Clear auth state
    try {
      await fs.remove(authPath);
      fs.ensureDirSync(authPath);
    } catch (e) {
      console.error("Error clearing auth folder:", e);
    }

    // Start fresh connection
    setTimeout(() => connectToWhatsApp(), 1000);
    return { success: true };
  } catch (error) {
    console.error("Logout Error:", error);
    return { success: false, message: error.message };
  }
}

export async function sendToGroup(jid, message) {
  if (!sock || !isConnected) {
    return { success: false, message: "WhatsApp not connected" };
  }
  try {
    const targetJid = jid.endsWith("@g.us") ? jid : `${jid}@g.us`;
    await sock.sendMessage(targetJid, { text: message });
    return { success: true };
  } catch (error) {
    console.error("Error sending to group:", error);
    return { success: false, message: error.message };
  }
}

export async function sendImageToGroup(jid, caption, imagePath) {
  if (!sock || !isConnected) {
    return { success: false, message: "WhatsApp not connected" };
  }
  try {
    const targetJid = jid.endsWith("@g.us") ? jid : `${jid}@g.us`;
    let imageSource;
    if (fs.existsSync(imagePath)) {
      imageSource = fs.readFileSync(imagePath);
    } else {
      throw new Error(`File not found: ${imagePath}`);
    }
    await sock.sendMessage(targetJid, { image: imageSource, caption: caption || "" });
    return { success: true };
  } catch (error) {
    console.error("Error sending image to group:", error);
    return { success: false, message: error.message };
  }
}