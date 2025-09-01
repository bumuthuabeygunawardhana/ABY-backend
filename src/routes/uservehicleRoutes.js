// routes/uservehicleRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  searchAvailableVehicles,
  getVehicleDetails,
  getUserBookings,
  updateBooking,
  deleteBooking
} from "../controllers/userVehicleController.js";

const router = express.Router();

// Search vehicles by date + category
router.post("/search", protect, searchAvailableVehicles);

// Get full details of a selected vehicle
router.get("/:id", protect, getVehicleDetails);

// Book a vehicle
//router.post("/book/:id", protect, bookVehicle);

router.get("/my/bookings", protect, getUserBookings);

// Edit booking by bookingId
router.put("/my/bookings/:id", protect, updateBooking);

// Delete booking by bookingId
router.delete("/my/bookings/:id", protect, deleteBooking);

export default router;