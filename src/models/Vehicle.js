// src/models/Vehicle.js
import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  name:{
    type:String,
    required:true,
    trim: true
  },
  category: {
    type: String,
    enum: ["bike", "tuk-tuk", "car", "van", "bus", "luxury-car"],
    required: true
  },
  photos: {
    type: [String], // Cloudinary URLs
    validate: v => Array.isArray(v) && v.length > 0
  },
  pricePerDay: { type: Number, required: true },
  dailyMileageLimit: { type: Number, required: true },
  pricePerExtraMile: { type: Number, required: true },
  minRentalDays: { type: Number, required: true },
  maxRentalDays: { type: Number, required: true },
  fuelType: { type: String, enum: ["Petrol", "Diesel", "Electric", "Hybrid"], required: true },
  serviceType: { type: String, enum: ["vehicle only", "with driver"], required: true },
  seats: { type: Number, required: true },
  doors: { type: Number, required: true },
  transmission: { type: String, enum: ["auto", "manual"], required: true },

  // future admin actions
  isAvailable: { type: Boolean, default: true },

  // who created it (admin id)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default mongoose.model("Vehicle", vehicleSchema);
