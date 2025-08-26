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
app.use(cors());

// 👉 Stripe webhook BEFORE json parser:
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Regular JSON parsing for the rest
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/vehicles",vehicleRoutes);
app.use("/api/uservehicle",uservehicleRoutes);   // for user part
app.use("/api/payments", paymentsRoutes);
export default app;
