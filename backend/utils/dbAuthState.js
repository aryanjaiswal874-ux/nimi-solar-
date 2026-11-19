import { Sequelize, DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// Model to store WhatsApp auth credentials
const WhatsAppAuth = sequelize.define("WhatsAppAuth", {
    key: {
        type: DataTypes.STRING(255),
        primaryKey: true,
    },
    value: {
        type: DataTypes.TEXT, // Store JSON stringified creds
        allowNull: false,
    },
}, {
    tableName: "whatsapp_auth",
    timestamps: true,
});

export async function initWhatsAppAuth() {
    await WhatsAppAuth.sync();
    return WhatsAppAuth;
}

export async function getWhatsAppAuth() {
    const WhatsAppAuth = await initWhatsAppAuth();
    return WhatsAppAuth;
}

export async function getAuthState() {
    const WhatsAppAuth = await initWhatsAppAuth();
    const records = await WhatsAppAuth.findAll();
    const creds = {};
    for (const record of records) {
        try {
            creds[record.key] = JSON.parse(record.value);
        } catch (e) {
            creds[record.key] = record.value;
        }
    }
    return { creds, keys: {} }; // keys will be empty for now, baileys will regenerate
}

export async function saveCreds(creds) {
    const WhatsAppAuth = await initWhatsAppAuth();
    for (const [key, value] of Object.entries(creds)) {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        await WhatsAppAuth.upsert({
            key,
            value: valueStr,
        });
    }
}

export async function clearAuthState() {
    const WhatsAppAuth = await initWhatsAppAuth();
    await WhatsAppAuth.destroy({ where: {} });
}