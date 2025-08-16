// src/routes/vehicleRoutes.js
import express from "express";
import { registerVehicle } from "../controllers/vehicleController.js";
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

export default router;
