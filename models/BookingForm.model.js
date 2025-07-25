const mongoose = require("mongoose");

const bookingformSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  country: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  zipCode: { type: String }, 
  email: { type: String, required: true },
  phone: { type: String, required: true },
  note: { type: String }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("BookingForm", bookingformSchema);
