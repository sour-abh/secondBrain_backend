import express from "express";
import serverless from "serverless-http";
import mongoose from "mongoose";
import cors from "cors";
import { env } from "../src/env.js";
import { userRouter } from "../src/auth.js";

const app = express();
app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use(
  cors({
    // Use FRONTEND_URL set in Vercel or fallback to localhost for local dev
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  })
);

let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) return;

  try {
    const db = await Promise.race([
      mongoose.connect(process.env.DB_CONNECT as string),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB connection timeout")), 5000)
      ),
    ]);
    isConnected = true;
    console.log("MongoDB connected");
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

app.use(async (req, res, next) => {
  if (req.path === "/health") return next();

  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("DB connection failed:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use("/app/v1", userRouter);

// Cached mongoose connection for serverless environment
type Cached = { conn: any | null; promise: Promise<any> | null };
declare global {
  // eslint-disable-next-line no-var
  var __mongoose__: Cached | undefined;
}

// async function connectToDatabase() {
//   const globalAny: any = global as any;
//   if (!globalAny.__mongoose__) {
//     globalAny.__mongoose__ = { conn: null, promise: null } as Cached;
//   }
//   const cached = globalAny.__mongoose__ as Cached;

//   if (cached.conn) {
//     return cached.conn;
//   }

//   if (!cached.promise) {
//     cached.promise = mongoose.connect(env.DB_CONNECT).then((m) => {
//       cached.conn = m;
//       return m;
//     });
//   }

//   return cached.promise;
// }

// Ensure DB connect is (at least) started at cold start
connectToDatabase().catch((err) => {
  console.error("Error connecting to DB:", err);
});

export default serverless(app as any);
