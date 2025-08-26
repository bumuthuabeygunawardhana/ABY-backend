// src/controllers/paymentsController.js
import stripe from "../config/stripe.js";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/bookingModel.js";

/** utility: integer days between two dates (ceil) */
const daysBetween = (a, b) =>
  Math.max(1, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));

/** Create Stripe Checkout Session for 15% deposit */
export const createCheckoutSession = async (req, res) => {
  try {
    const { vehicleId, pickupDate, returnDate } = req.body;
    if (!vehicleId || !pickupDate || !returnDate) {
      return res.status(400).json({ message: "vehicleId, pickupDate, returnDate required" });
    }

    const pickup = new Date(pickupDate);
    const drop = new Date(returnDate);

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const days = daysBetween(pickup, drop);
    const totalPrice = days * vehicle.pricePerDay;
    const depositAmount = Math.round(totalPrice * 0.15 * 100); // minor units (cents)

    // quick availability check (true overlap)
    const conflict = await Booking.findOne({
      vehicle: vehicleId,
      pickupDate: { $lte: drop },
      returnDate: { $gte: pickup }
    });
    if (conflict) {
      return res.status(409).json({ message: "Vehicle not available for these dates" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: req.user?.email, // optional, prefill if you have it
      line_items: [
        {
          price_data: {
            currency: process.env.STRIPE_CURRENCY || "usd",
            product_data: {
              name: `${vehicle.name} — 15% deposit`,
              description: `Rental ${pickup.toDateString()} → ${drop.toDateString()} (${days} days)`,
            },
            unit_amount: depositAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
      metadata: {
        userId: String(req.user.id),
        vehicleId: String(vehicleId),
        pickupDate: pickup.toISOString(),
        returnDate: drop.toISOString(),
        totalPrice: String(totalPrice),
        depositAmount: String(depositAmount / 100),
      },
    });

    return res.status(200).json({
      message: "Checkout created",
      checkoutUrl: session.url,       // open this in browser / RN WebView
      sessionId: session.id,
      totalPrice,
      deposit: depositAmount / 100,
    });
  } catch (err) {
    console.error("createCheckoutSession error:", err);
    res.status(500).json({ message: err.message });
  }
};

/** Stripe Webhook: create booking after payment succeeds */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // set in step 5
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const {
        userId,
        vehicleId,
        pickupDate,
        returnDate,
        totalPrice,
        depositAmount,
      } = session.metadata || {};

      const pickup = new Date(pickupDate);
      const drop = new Date(returnDate);

      // Re-check availability at payment time
      const conflict = await Booking.findOne({
        vehicle: vehicleId,
        pickupDate: { $lte: drop },
        returnDate: { $gte: pickup },
      });

      if (conflict) {
        // refund the deposit (rare edge case)
        try {
          await stripe.refunds.create({ payment_intent: session.payment_intent });
          console.warn("Conflict detected post-payment. Refunded:", session.id);
        } catch (rerr) {
          console.error("Refund failed:", rerr.message);
        }
        return res.status(200).json({ received: true });
      }

      // Create the confirmed booking
      await Booking.create({
        user: userId,
        vehicle: vehicleId,
        pickupDate: pickup,
        returnDate: drop,
        totalPrice: Number(totalPrice),
        depositAmount: Number(depositAmount),
        paymentStatus: "paid",
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
      });

      // Optional: emit realtime update if you mounted socket.io earlier
      try {
        const io = req.app?.get("io");
        if (io) {
          io.emit("vehicleBooked", {
            vehicleId,
            pickupDate: pickup.toISOString(),
            returnDate: drop.toISOString(),
          });
        }
      } catch (e) {
        console.error("Emit after webhook failed:", e.message);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
