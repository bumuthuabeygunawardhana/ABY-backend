// src/routes/paymentsRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createCheckoutSession, stripeWebhook } from "../controllers/paymentsController.js";

const router = express.Router();

// 1) Create checkout session (JSON body)
// Body: { vehicleId, pickupDate, returnDate }
router.post("/checkout", protect, createCheckoutSession);

// 2) Webhook MUST use raw body (mounted in app.js, not here)
// (exporting handler so app.js can mount it with express.raw)
export { stripeWebhook };

export default router;
