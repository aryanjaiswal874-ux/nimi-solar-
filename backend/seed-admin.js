
import dotenv from "dotenv";
import { Sequelize } from "sequelize";
import bcrypt from "bcryptjs";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mariadb",
    logging: false,
  }
);

async function seedAdmin() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    // NOTE: Super Admin should be created via the secure setup endpoint at /api/auth/super-admin-setup
    // This script is kept for backward compatibility but creates a regular admin user for development
    const email = "admin@admin.com";
    const password = "admin123";
    const hashed = await bcrypt.hash(password, 10);

    // Check if admin user already exists
    const [existing] = await sequelize.query(
      `SELECT id FROM Users WHERE email = ?`,
      { replacements: [email] }
    );

    if (existing.length > 0) {
      // Update password and ensure role is admin
      await sequelize.query(
        `UPDATE Users SET password = ?, role = 'admin' WHERE email = ?`,
        { replacements: [hashed, email] }
      );
      console.log(`✅ Admin user updated — email: ${email}`);
    } else {
      // Insert new admin user
      const uuid = Sequelize.literal("UUID()");
      await sequelize.query(
        `INSERT INTO Users (id, full_name, mobile, email, password, role, is_active, createdAt, updatedAt)
         VALUES (UUID(), 'Admin', '0000000000', ?, ?, 'admin', 1, NOW(), NOW())`,
        { replacements: [email, hashed] }
      );
      console.log(`✅ Admin user created — email: ${email} (password: admin123)`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedAdmin();
