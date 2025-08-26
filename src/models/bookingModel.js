// models/bookingModel.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true },

    // NEW optional payment fields
    depositAmount: { type: Number }, // 15% deposit actually paid
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
