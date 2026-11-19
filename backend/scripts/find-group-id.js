import { ERP_OfficeSetting, WhatsAppChat, WhatsAppMessage } from "../models/index.js";
import { getSock } from "../utils/whatsappBot.js";

async function findGroupID() {
    try {
        console.log("🔍 Starting WhatsApp Group ID Search...\n");

        // 1. Check current registered group in settings
        const settings = await ERP_OfficeSetting.findOne();
        if (!settings) {
            console.log("❌ No office settings found.");
            return;
        }

        console.log("------------------------------------------");
        console.log(`🔍 CURRENT REGISTERED JID: ${settings.whatsapp_group_jid || "NOT SET"}`);
        console.log("------------------------------------------\n");

        // 2. Check if WhatsApp is connected
        const { getSock } = await import("../utils/whatsappBot.js");
        const sock = getSock();

        if (!sock) {
            console.log("❌ WhatsApp Bot is not connected. Connect first.");
            console.log("Please scan the QR code in the server logs to connect WhatsApp.");
            return;
        }

        // 3. Fetch all participating groups
        console.log("🔍 Checking Bot Group Memberships...");
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);

        console.log(`\n📋 Total Groups Bot is Member of: ${groupList.length}\n`);

        if (groupList.length === 0) {
            console.log("❌ Bot is not a member of any groups.");
            console.log("Please invite the bot to the target WhatsApp group first.");
            return;
        }

        // 3. Check the currently configured group
        const registeredJID = "120363426215512132@g.us"; // From ERP_OfficeSetting default
        const found = groupList.find(g => g.id === "120363426215512132@g.us");

        if (found) {
            console.log(`\n✅ MATCH FOUND: Bot is a member of "${found.subject}"`);
            console.log(`   Group JID: ${found.id}`);
            console.log(`   Group Name: ${found.subject}`);
            console.log(`\n✅ This is your ACTUAL GROUP ID: ${found.id}`);
        } else {
            console.log("❌ NO MATCH: Bot is NOT a member of the registered group (120363426215512132@g.us)");
            console.log("\n📋 GROUPS THE BOT IS CURRENTLY IN:");
            groupList.forEach(g => {
                console.log(`👉 ${g.subject} | JID: ${g.id}`);
            });
            console.log("\n💡 ACTION REQUIRED:");
            console.log("1. The bot is not a member of the registered group (120363426215512132@g.us)");
            console.log("2. You need to either:");
            console.log("   a) Invite the bot to that group, OR");
            console.log("   b) Update ERP_OfficeSetting.whatsapp_group_jid to match one of the groups above");
            console.log("3. The invite link you provided (https://chat.whatsapp.com/ChS8DvYMCOS2O7LQ8jYIzY)");
            console.log("   has an invite code, not the actual Group ID (JID).");
        }

        console.log("\n------------------------------------------");

        // 4. Check the database for existing chats
        console.log("\n📊 DATABASE CHAT RECORDS:");
        const { WhatsAppChat } = await import("../models/index.js");
        const chats = await (await import("../models/index.js")).WhatsAppChat.findAll();

        if (chats.length > 0) {
            console.log(`\n📋 CHATS IN DATABASE (${chats.length} total):`);
            chats.forEach((chat, index) => {
                console.log(`${index + 1}. ${chat.name || "NO NAME"} | JID: ${chat.jid} | Last: ${chat.lastMessage || "NONE"} | Unread: ${chat.unreadCount}`);
            });
        } else {
            console.log("\n📋 No chats found in database.");
        }

        console.log("\n------------------------------------------");
        console.log("✅ Search Complete!");

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error.stack);
    }
}

// Run the script
findGroupID()
    .then(() => {
        console.log("\n✅ Script completed.");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Fatal error:", err);
        process.exit(1);
    });