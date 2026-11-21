import "dotenv/config";
import express from "express";
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
import axios from "axios";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configuration
const PORT = process.env.WHATSAPP_SERVICE_PORT || 3001;
const ERP_API_URL = process.env.ERP_API_URL || "http://localhost:5577/api";
const AUTH_DIR = path.join(process.cwd(), "auth_info");
const COMPANY_NAME = process.env.COMPANY_NAME || "ERP";
const MAX_RECONNECT_ATTEMPTS = 10;

// Ensure auth directory exists
fs.ensureDirSync(AUTH_DIR);

// WhatsApp socket state
let sock = null;
let reconnectAttempts = 0;
let lastQR = null;
let isConnected = false;
let connectedUser = null;
let connectionState = "disconnected"; // disconnected, connecting, connected, logged_out
let currentGroupJid = null;

// Initialize WhatsApp connection
async function connectToWhatsApp() {
  if (sock && connectionState === "connected") {
    return sock;
  }

  try {
    connectionState = "connecting";

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
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
      browser: [`${COMPANY_NAME} Attendance Bot`, "Chrome", "1.0.0"],
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
            await fs.remove(AUTH_DIR);
            fs.ensureDirSync(AUTH_DIR);
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
        console.log(`✅✅✅ ${COMPANY_NAME} WHATSAPP BOT IS ONLINE ✅✅✅`);
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

// Generate QR code as base64 image for frontend
async function getQRCodeBase64() {
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

// Send message to group
async function sendToGroup(jid, message) {
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

// Send image to group
async function sendImageToGroup(jid, caption, imageBase64) {
  if (!sock || !isConnected) {
    return { success: false, message: "WhatsApp not connected" };
  }
  try {
    const targetJid = jid.endsWith("@g.us") ? jid : `${jid}@g.us`;
    let imageBuffer;
    if (imageBase64.startsWith("data:image")) {
      const base64Data = imageBase64.split(",")[1];
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      imageBuffer = Buffer.from(imageBase64, "base64");
    }
    await sock.sendMessage(targetJid, { image: imageBuffer, caption: caption || "" });
    return { success: true };
  } catch (error) {
    console.error("Error sending image to group:", error);
    return { success: false, message: error.message };
  }
}

// Get WhatsApp status
function getWhatsAppStatus() {
  return {
    isConnected,
    connectionState,
    qr: lastQR,
    user: connectedUser,
  };
}

// Fetch groups
async function fetchGroups() {
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

// Logout WhatsApp
async function logoutWhatsApp() {
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
      await fs.remove(AUTH_DIR);
      fs.ensureDirSync(AUTH_DIR);
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

// Set group JID for attendance notifications
function setGroupJid(jid) {
  currentGroupJid = jid;
  return { success: true, groupJid: jid };
}

function getGroupJid() {
  return currentGroupJid;
}

// REST API endpoints
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "whatsapp-service", timestamp: new Date().toISOString() });
});

app.get("/status", (req, res) => {
  res.json(getWhatsAppStatus());
});

app.get("/qr", async (req, res) => {
  try {
    const qrBase64 = await getQRCodeBase64();
    if (!qrBase64) {
      return res.json({ qr: null, message: "No QR code available. WhatsApp may already be connected." });
    }
    res.json({ qr: qrBase64 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/groups", async (req, res) => {
  try {
    const result = await fetchGroups();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/logout", async (req, res) => {
  try {
    const result = await logoutWhatsApp();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/test-message", async (req, res) => {
  try {
    const { jid, message } = req.body;
    if (!jid || !message) {
      return res.status(400).json({ error: "JID and message are required" });
    }
    const result = await sendToGroup(jid, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/test-image", async (req, res) => {
  try {
    const { jid, caption, imageBase64 } = req.body;
    if (!jid || !imageBase64) {
      return res.status(400).json({ error: "JID and image are required" });
    }
    const result = await sendImageToGroup(jid, caption || "", imageBase64);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/set-group-jid", async (req, res) => {
  try {
    const { jid } = req.body;
    if (!jid) {
      return res.status(400).json({ error: "Group JID is required" });
    }
    const result = setGroupJid(jid);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/group-jid", (req, res) => {
  res.json({ groupJid: currentGroupJid });
});

// Attendance notification endpoint
app.post("/attendance/notify", async (req, res) => {
  try {
    const { employeeName, status, date, time, location, photo } = req.body;

    if (!employeeName || !status) {
      return res.status(400).json({ error: "employeeName and status are required" });
    }

    const groupJid = currentGroupJid || process.env.WHATSAPP_ATTENDANCE_GROUP_JID;
    if (!groupJid) {
      return res.status(400).json({ error: "No WhatsApp group configured for attendance notifications" });
    }

    const displayDate = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const displayTime = new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const isPunchIn = status === 'in' || status === 'PUNCH IN' || status === 'punch_in';
    const statusIcon = isPunchIn ? '✅' : '✔️';
    const statusText = isPunchIn ? 'PUNCH IN ✅' : 'PUNCH OUT';

    const caption = `☀️ SOLAR ATTENDANCE

Employee Name: ${employeeName}

Status: ${statusText}

Date: ${displayDate}

Time: ${displayTime}

Location: ${location || 'N/A'}`;

    let result;
    if (photo) {
      result = await sendImageToGroup(groupJid, caption, photo);
    } else {
      result = await sendToGroup(groupJid, caption);
    }

    res.json({ success: result.success, whatsappResult: result });
  } catch (error) {
    console.error("Attendance notification error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const startServer = async () => {
  try {
    await connectToWhatsApp();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 WhatsApp Service running on port ${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`📱 Status: http://localhost:${PORT}/status`);
      console.log(`📱 QR: http://localhost:${PORT}/qr`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error("❌ Failed to start WhatsApp service:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down WhatsApp service...");
  if (sock) {
    await sock.logout();
    sock.end();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down WhatsApp service...");
  if (sock) {
    await sock.logout();
    sock.end();
  }
  process.exit(0);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err);
  process.exit(1);
});

startServer();

export { connectToWhatsApp, getWhatsAppStatus, getQRCodeBase64, fetchGroups, logoutWhatsApp, sendToGroup, sendImageToGroup, setGroupJid, getGroupJid };