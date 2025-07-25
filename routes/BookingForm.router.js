const express = require("express");
const router = express.Router();
const Booking = require("../models/BookingForm.model");

router.post("/", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      country,
      address,
      city,
      zipCode,
      email,
      phone,
      note
    } = req.body;

    if (!firstName || !lastName || !country || !address || !city || !email || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const booking = new Booking({
      firstName,
      lastName,
      country,
      address,
      city,
      zipCode,
      email,
      phone,
      note
    });

    await booking.save();
    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
