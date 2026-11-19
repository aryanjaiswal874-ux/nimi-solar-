import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import multer from "multer";
import path from "path";
import {
  getWhatsAppStatus,
  connectToWhatsApp,
  getQRCodeBase64,
  fetchGroups,
  logoutWhatsApp,
  sendToGroup,
  sendImageToGroup,
} from "../utils/waBot.js";

const router = express.Router();

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/whatsapp/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Get WhatsApp connection status
router.get("/status", protect, adminOnly, (req, res) => {
  try {
    const status = getWhatsAppStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get QR code as base64 image
router.get("/qr", protect, adminOnly, async (req, res) => {
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

// Fetch all WhatsApp groups
router.get("/groups", protect, adminOnly, async (req, res) => {
  try {
    const result = await fetchGroups();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect/logout WhatsApp
router.post("/logout", protect, adminOnly, async (req, res) => {
  try {
    const result = await logoutWhatsApp();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test send message to group
router.post("/test-message", protect, adminOnly, async (req, res) => {
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

// Test send image to group
router.post("/test-image", protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { jid, caption } = req.body;
    if (!jid || !req.file) {
      return res.status(400).json({ error: "JID and image are required" });
    }
    const result = await sendImageToGroup(jid, caption || "", req.file.path);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;