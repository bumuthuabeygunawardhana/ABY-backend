// routes/uservehicleRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  searchAvailableVehicles,
  getVehicleDetails,
  bookVehicle,
} from "../controllers/userVehicleController.js";

const router = express.Router();

// Search vehicles by date + category
router.post("/search", protect, searchAvailableVehicles);

// Get full details of a selected vehicle
router.get("/:id", protect, getVehicleDetails);

// Book a vehicle
router.post("/book/:id", protect, bookVehicle);

export default router;