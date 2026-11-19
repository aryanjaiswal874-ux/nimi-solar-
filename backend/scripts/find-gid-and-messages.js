import { WhatsAppChat, WhatsAppMessage, ERP_OfficeSetting } from "../models/index.js";

async function findGIDAndMessages() {
    try {
        console.log("🔍 Starting WhatsApp GID and Messages search...\n");

        // 1. Get the registered group JID from settings
        const settings = await ERP_OfficeSetting.findOne();
        if (!settings) {
            console.log("❌ No office settings found.");
            return;
        }

        console.log("📋 Registered Group JID:", settings.whatsapp_group_jid || "NOT SET");
        console.log("📋 Registered Group Name:", settings.whatsapp_group_name || "NOT SET");
        console.log("------------------------------------------\n");

        // 2. Get all chats from database
        const chats = await WhatsAppChat.findAll();
        console.log(`\n📋 Total Chats in DB: ${chats.length}\n`);

        if (chats.length > 0) {
            console.log("📋 ALL CHATS IN DATABASE:");
            chats.forEach((chat, index) => {
                console.log(`${index + 1}. ${chat.name || "NO NAME"} | JID: ${chat.jid} | Last Msg: ${chat.lastMessage || "NONE"} | Unread: ${chat.unreadCount}`);
            });
            console.log("");
        }

        // 3. Get messages from database
        const messages = await WhatsAppMessage.findAll({
            order: [['timestamp', 'DESC']],
            limit: 50
        });

        console.log(`\n📝 LATEST ${messages.length} MESSAGES IN DB:\n`);
        messages.forEach((msg, index) => {
            const date = new Date(msg.timestamp).toLocaleString();
            const direction = msg.fromMe ? "📤 OUT" : "📥 IN";
            const content = msg.content ? msg.content.substring(0, 80) : (msg.type || "MEDIA");
            console.log(`${index + 1}. ${direction} | ${msg.jid} | ${date} | ${content}`);
        });

        console.log("\n✅ Search Complete! (Database only - no live WhatsApp connection)");

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error.stack);
    }
}

// Run the script
findGIDAndMessages()
    .then(() => {
        console.log("\n✅ Script completed.");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Fatal error:", err);
        process.exit(1);
    });