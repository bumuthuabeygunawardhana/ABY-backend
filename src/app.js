import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import uservehicleRoutes from "./routes/uservehicleRoutes.js";
import paymentsRoutes, { stripeWebhook } from "./routes/paymentsRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",         // Admin web app (React)
    "http://localhost:8081",         // Expo web preview
    "exp://192.168.207.50:8081"        // Expo Go mobile app (replace IP with your own)
  ],
  credentials: true
}));

//  Stripe webhook BEFORE json parser:
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Regular JSON parsing for the rest
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/vehicles",vehicleRoutes);
app.use("/api/uservehicle",uservehicleRoutes);   // for user part
app.use("/api/payments", paymentsRoutes);
export default app;
