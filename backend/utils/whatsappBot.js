import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import path from "path";
import fs from "fs-extra";
import moment from "moment";
import { getAuthState, saveCreds, clearAuthState, initWhatsAppAuth } from "./dbAuthState.js";

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let lastQR = null;
let isConnected = false;
let connectedUser = null;

// Initialize WhatsApp auth table on startup
initWhatsAppAuth().catch(console.error);

// Helper function to extract message content (as provided by user)
function extractMessageContent(message) {
  if (!message) return "";

  try {
    // Unwrap common wrapped messages
    if (message.ephemeralMessage && message.ephemeralMessage.message) {
      message = message.ephemeralMessage.message;
    }
    if (message.viewOnceMessage && message.viewOnceMessage.message) {
      message = message.viewOnceMessage.message;
    }
    if (message.viewOnceMessageV2 && message.viewOnceMessageV2.message) {
      message = message.viewOnceMessageV2.message;
    }
    if (message.documentWithCaptionMessage && message.documentWithCaptionMessage.message) {
      message = message.documentWithCaptionMessage.message;
    }

    // Check for different message types
    if (message.conversation) {
      return message.conversation;
    }
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }
    if (message.imageMessage?.caption) {
      return message.imageMessage.caption;
    }
    if (message.videoMessage?.caption) {
      return message.videoMessage.caption;
    }
    if (message.documentMessage?.caption) {
      return message.documentMessage.caption;
    }
    if (message.buttonsResponseMessage?.selectedButtonId) {
      return message.buttonsResponseMessage.selectedButtonId;
    }
    if (message.listResponseMessage?.singleSelectReply?.selectedRowId) {
      return message.listResponseMessage.singleSelectReply.selectedRowId;
    }
    if (message.templateButtonReplyMessage?.selectedId) {
      return message.templateButtonReplyMessage.selectedId;
    }
    if (message.contactMessage?.displayName) {
      return `Contact: ${message.contactMessage.displayName}`;
    }
    if (message.locationMessage) {
      return `Location: ${message.locationMessage.degreesLatitude}, ${message.locationMessage.degreesLongitude}`;
    }
    if (message.audioMessage) {
      return "🎵 Audio message";
    }
    if (message.videoMessage) {
      return "🎥 Video message";
    }
    if (message.imageMessage) {
      return "📷 Image message";
    }
    if (message.stickerMessage) {
      return "🖼️ Sticker";
    }
    if (message.documentMessage) {
      return `📄 Document: ${message.documentMessage.title || "Unnamed"}`;
    }

    return "[Message type not supported or complex message]";
  } catch (error) {
    console.error("Error extracting message:", error);
    return "[Error extracting message]";
  }
}

export async function connectToWhatsApp() {
  try {
    const { creds, keys } = await getAuthState();
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`Using WhatsApp version: ${version.join(".")}, isLatest: ${isLatest}`);

    const loggerWA = pino({ level: "silent" });
    sock = makeWASocket({
      version,
      auth: {
        creds,
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
        console.log("\n📱📱📱 SCAN THIS QR CODE WITH WHATSAPP 📱📱📱");
        qrcode.generate(qr, { small: true });
        console.log("\n📱 Scan the QR code above with your WhatsApp app\n");
      }

      if (connection === "close") {
        isConnected = false;
        connectedUser = null;
        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output.statusCode
            : 500;

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        const isRestartRequired = statusCode === 515;

        console.log(`\n🔴 Connection closed. Status code: ${statusCode}, Should reconnect: ${shouldReconnect}\n`);

        if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          setTimeout(() => connectToWhatsApp(), 1000 * reconnectAttempts);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log("❌ Max reconnection attempts reached. Please restart manually.");
        } else {
          console.log("🔴 Logged out. Please remove auth folder and scan QR code again.");
          fs.removeSync(authPath);
          reconnectAttempts = 0;
          connectToWhatsApp();
        }
      }

      if (connection === "open") {
        isConnected = true;
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

    // Listen to ALL message events with detailed logging as requested
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      const { WhatsAppMessage, WhatsAppChat } = await import("../models/index.js");
      
      for (const msg of messages) {
        try {
          const message = msg;
          const isFromMe = message.key.fromMe;
          const remoteJid = message.key.remoteJid;

          if (!remoteJid) continue;
          if (remoteJid === "status@broadcast") continue;

          const isGroup = remoteJid.endsWith("@g.us");
          const participant = message.key.participant || remoteJid;
          const isLid = message.key.participant?.includes("@lid");
          const pushName = message.pushName || "Unknown";

          const botIdRaw = sock.user?.id || "";
          const botNumber = botIdRaw.split(":")[0].split("@")[0] || "Bot";

          const senderNumber = isFromMe ? botNumber : participant.split("@")[0];
          const receiverNumber = isFromMe ? remoteJid.split("@")[0] : botNumber;

          const messageContent = extractMessageContent(message.message);
          const rawType = Object.keys(message.message || {})[0] || "unknown";

          // Simplified well-organized log
          if (isGroup) {
              console.log(`[WA] Group: ${remoteJid} | From: ${participant} | LID: ${isLid} | Type: ${rawType}`);
          } else {
              console.log(`[WA] Personal: ${remoteJid} | Type: ${rawType}`);
          }
          // DB Storage for history is removed to avoid burden

        } catch (msgError) {
          console.error("❌ Error processing message:", msgError);
        }
      }
    });

    return sock;
  } catch (error) {
    console.error("❌ Error connecting to WhatsApp:", error.message);
    setTimeout(() => connectToWhatsApp(), 5000);
  }
}

export const getSock = () => sock;
export const getWhatsAppStatus = () => ({
    isConnected,
    qr: lastQR,
    user: connectedUser
});

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

        await clearAuthState();

        // Let it reconnect automatically via the loop or manual call
        connectToWhatsApp();
        return { success: true };
    } catch (error) {
        console.error("Logout Error:", error);
        return { success: false, message: error.message };
    }
}
