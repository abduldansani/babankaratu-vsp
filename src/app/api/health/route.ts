import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

export async function GET() {
  try {
    await dbConnect();
    const isConnected = mongoose.connection.readyState === 1;

    return NextResponse.json({
      status: "ok",
      connected: isConnected,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        connected: false,
        message: error instanceof Error ? error.message : "Database connection failed",
        hint: "Make sure local MongoDB is running at mongodb://127.0.0.1:27017",
      },
      { status: 500 }
    );
  }
}
