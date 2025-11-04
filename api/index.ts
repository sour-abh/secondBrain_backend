import express from "express";
import serverless from "serverless-http";
import mongoose from "mongoose";
import cors from "cors";
import { userRouter } from "../src/auth.js";

const app = express();

// 1. Move health check before any middleware
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    // 2. Add environment variable checks to help debug
    env: {
      hasFrontendUrl: !!process.env.FRONTEND_URL,
      hasDbConnect: !!process.env.DB_CONNECT,
      hasJwtSecret: !!process.env.JWT_SECRET,
    },
  });
});

// 3. Basic middleware setup
app.use(express.json());

// 4. Improved CORS setup with proper error handling
app.use(
  cors({
    // Remove any trailing slash from FRONTEND_URL
    origin:
      process.env.FRONTEND_URL?.replace(/\/$/, "") ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// 5. Simplified MongoDB connection with proper timeout
let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) {
    return Promise.resolve();
  }

  try {
    // 6. Add connection timeout
    const db = await Promise.race([
      mongoose.connect(process.env.DB_CONNECT as string, {
        // 7. Add MongoDB connection optimizations
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000,
        maxPoolSize: 10,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Database connection timeout after 5s")),
          5000
        )
      ),
    ]);

    isConnected = true;
    console.log("MongoDB connected successfully");
    return db;
  } catch (error) {
    isConnected = false;
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

// 8. Add debug endpoint for connection testing
app.get("/debug/db", async (req, res) => {
  try {
    await connectToDatabase();
    res.json({
      status: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Database connection failed",
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// 9. Database connection middleware
app.use(async (req, res, next) => {
  // Skip DB connection check for health endpoint
  if (req.path === "/health") {
    return next();
  }

  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Database connection middleware error:", error);
    res.status(503).json({
      error: "Service temporarily unavailable",
      message: "Database connection failed",
      retry: true,
    });
  }
});

// 10. Mount API routes
app.use("/app/v1", userRouter);

// 11. Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);

    // Don't expose internal errors to client
    res.status(500).json({
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? err instanceof Error
            ? err.message
            : String(err)
          : "An unexpected error occurred",
    });
  }
);

// 12. Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// 13. Export the serverless handler with configuration
export default serverless(app, {
  binary: false,
  provider: "vercel",
});
