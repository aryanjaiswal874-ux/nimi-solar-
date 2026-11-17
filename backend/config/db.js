import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Support postgres (Render), mariadb, mysql
const DIALECT = process.env.DB_DIALECT || "mariadb";

let sequelize;

if (process.env.DATABASE_URL) {
  // Render / managed Postgres provides DATABASE_URL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: DIALECT,
    logging: false,
    dialectOptions: {
      connectTimeout: 30000,
      ssl: DIALECT === "postgres" ? { require: true, rejectUnauthorized: false } : undefined
    },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  });
} else {
  // Fallback: individual params (local dev)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || (DIALECT === "postgres" ? 5432 : 3306),
      dialect: DIALECT,
      logging: false,
      dialectOptions: { connectTimeout: 30000 },
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
    }
  );
}

export default sequelize;
