const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
  building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
  floorNumber: Number,
  totalUnits: Number,
  image: { type: String }, // floor key plan
  // coordinates: {
  //   type: Map,
  //   of: [Number],
  //   default: {}
  // }
});

module.exports = mongoose.model('Floor', floorSchema);