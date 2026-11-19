import "dotenv/config";
process.env.TZ = 'Asia/Kolkata';
import app from "./app.js";
import { syncDatabase } from "./models/index.js";
import { connectToWhatsApp } from "./utils/waBot.js";
import initCronJobs from "./utils/cronJobs.js";

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await syncDatabase();
    await connectToWhatsApp();
    initCronJobs();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ERP Service running on port ${PORT}`);
      console.log(`📄 Swagger: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop other processes running on this port.`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

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
