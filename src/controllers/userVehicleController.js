import Vehicle from "../models/Vehicle.js";
import Booking from "../models/bookingModel.js";


// 1. Search available vehicles
export const searchAvailableVehicles = async (req, res) => {
  try {
    const { pickupDate, returnDate, category } = req.body;

    if (!pickupDate || !returnDate || !category) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Convert to Date objects
    const pickup = new Date(pickupDate);
    const drop = new Date(returnDate);

    // Get all vehicles in that category
    const vehicles = await Vehicle.find({ category });

    // Check if each vehicle is available in that range
    let availableVehicles = [];
    for (let v of vehicles) {
      const bookingExists = await Booking.findOne({
        vehicle: v._id,
        $or: [
          { pickupDate: { $lte: drop }, returnDate: { $gte: pickup } }, // overlapping bookings
        ],
      });

      if (!bookingExists) {
        availableVehicles.push({
          _id: v._id,
          name: v.name,
          fuelType: v.fuelType,
          serviceType: v.serviceType,
          photos: v.photos[0], // send first photo for listing
        });
      }
    }

    res.json(availableVehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get full vehicle details + calculated price
export const getVehicleDetails = async (req, res) => {
  try {
    const { pickupDate, returnDate } = req.query; // dates passed as query params
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    let totalPrice = null;
    let deposit = null;
    if (pickupDate && returnDate) {
      const pickup = new Date(pickupDate);
      const drop = new Date(returnDate);

      const days = Math.ceil((drop - pickup) / (1000 * 60 * 60 * 24));
      totalPrice = days * vehicle.pricePerDay;
      deposit = +(totalPrice * 0.15).toFixed(2);
    }

    res.json({
      ...vehicle.toObject(), // include all vehicle details
      totalPrice, // show calculated price if dates were provided
      deposit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 3. Book vehicle
export const bookVehicle = async (req, res) => {
  try {
    const { pickupDate, returnDate } = req.body;
    const vehicleId = req.params.id;

    const pickup = new Date(pickupDate);
    const drop = new Date(returnDate);

    // Check if vehicle already booked
    const bookingExists = await Booking.findOne({
      vehicle: vehicleId,
      $or: [{ pickupDate: { $lte: drop }, returnDate: { $gte: pickup } }],
    });

    if (bookingExists) {
      return res.status(400).json({ message: "Vehicle not available for these dates" });
    }

    // Find vehicle to calculate price
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const days = Math.ceil((drop - pickup) / (1000 * 60 * 60 * 24));
    const totalPrice = days * vehicle.pricePerDay;

    // Create booking
    const newBooking = await Booking.create({
      user: req.user.id,
      vehicle: vehicleId,
      pickupDate: pickup,
      returnDate: drop,
      totalPrice,
    });

    //  Emit socket event (safe and optional)
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("vehicleBooked", {
          vehicleId,
          pickupDate: pickup.toISOString(),
          returnDate: drop.toISOString(),
          bookingId: newBooking._id
        });
      }
    } catch (emitErr) {
      console.error("Socket emit error:", emitErr);
      // Do not break booking if emit fails
    }

    res.json({ message: "Booking successful", booking: newBooking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
