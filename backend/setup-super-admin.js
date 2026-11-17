import dotenv from "dotenv";
import { User } from "./models/index.js";
import bcrypt from "bcryptjs";
import generateToken from "./utils/generateToken.js";

dotenv.config();

async function setupSuperAdmin() {
    try {
        console.log("🔧 Setting up Super Admin for NIMI PRIVATE LIMITED...\n");

        const email = "wariskhan007@gmail.com";
        const password = "waris007";

        // Check if super_admin already exists
        const existingSuperAdmin = await User.findOne({ where: { role: 'super_admin' } });
        if (existingSuperAdmin) {
            console.log("⚠️  Super Admin already exists:", existingSuperAdmin.email);
            console.log("   If you want to reset, delete the user first from database.");
            process.exit(0);
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            console.log("⚠️  User with this email already exists:", email);
            process.exit(1);
        }

        // Hash password with bcrypt (10 rounds)
        console.log("🔐 Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Super Admin
        console.log("👤 Creating Super Admin user...");
        const superAdmin = await User.create({
            full_name: "Super Admin",
            mobile: "0000000000",
            email: email,
            password: hashedPassword,
            role: "super_admin",
            is_active: true,
            designation: "Super Admin",
        });

        // Generate token
        const token = generateToken(superAdmin.id, superAdmin.role);

        console.log("\n✅ ========================================");
        console.log("✅ SUPER ADMIN CREATED SUCCESSFULLY!");
        console.log("✅ ========================================\n");
        console.log("📧 Email:     ", email);
        console.log("🔑 Password:  ", password);
        console.log("🆔 User ID:   ", superAdmin.id);
        console.log("👑 Role:      ", superAdmin.role);
        console.log("\n🎫 JWT Token:");
        console.log(token);
        console.log("\n📋 Next Steps:");
        console.log("1. Open frontend: http://localhost:5173");
        console.log("2. Click 'Admin Login' tab");
        console.log("3. Enter email & password above");
        console.log("4. Go to Administration → Users to create workers");

        process.exit(0);
    } catch (error) {
        console.error("❌ Setup failed:", error.message);
        process.exit(1);
    }
}

setupSuperAdmin();