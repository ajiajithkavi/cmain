const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },           // who requested
  builder: { type: mongoose.Schema.Types.ObjectId, ref: 'BuilderProfile', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },                    
  appointmentDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
