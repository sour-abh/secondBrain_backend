import express from "express";
import serverless from "serverless-http";
import mongoose from "mongoose";
import cors from "cors";
import { env } from "../src/env.js";
import { userRouter } from "../src/auth.js";

const app = express();
app.use(express.json());
app.use(
  cors({
    // Use FRONTEND_URL set in Vercel or fallback to localhost for local dev
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  })
);

app.use("/app/v1", userRouter);

// Cached mongoose connection for serverless environment
type Cached = { conn: any | null; promise: Promise<any> | null };
declare global {
  // eslint-disable-next-line no-var
  var __mongoose__: Cached | undefined;
}

async function connectToDatabase() {
  const globalAny: any = global as any;
  if (!globalAny.__mongoose__) {
    globalAny.__mongoose__ = { conn: null, promise: null } as Cached;
  }
  const cached = globalAny.__mongoose__ as Cached;

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.DB_CONNECT).then((m) => {
      cached.conn = m;
      return m;
    });
  }

  return cached.promise;
}

// Ensure DB connect is (at least) started at cold start
connectToDatabase().catch((err) => {
  console.error("Error connecting to DB:", err);
});

export default serverless(app as any);
