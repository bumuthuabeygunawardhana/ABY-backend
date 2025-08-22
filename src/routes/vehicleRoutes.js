// src/routes/vehicleRoutes.js
import express from "express";
import { registerVehicle,getVehicleCategories,getVehiclesByCategory,getVehicleById,updateVehicle,deleteVehicle } from "../controllers/vehicleController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// name your form-data field "photos"
router.post(
  "/register",
  protect,
  adminOnly,
  upload.array("photos", 10), // up to 10 images
  registerVehicle
);

// Get all distinct categories
router.get("/admin/categories", protect, adminOnly, getVehicleCategories);

// Get vehicles by category (only name + photo)
router.get("/admin/category/:category", protect, adminOnly, getVehiclesByCategory);

// Get full details of a vehicle by ID
router.get("/admin/:id", protect, adminOnly, getVehicleById);

// Update vehicle details
router.put(
  "/admin/:id",
  protect,
  adminOnly,
  upload.array("photos", 10), // optional photos
  updateVehicle
);

// Delete vehicle
router.delete("/admin/:id", protect, adminOnly, deleteVehicle);

export default router;
