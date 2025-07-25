const mongoose = require('mongoose');

const unitMediaSchema = new mongoose.Schema({
  url:   { type: String, required: true },
  type:  { type: String, required: true },
  title: { type: String }
});

const unitSchema = new mongoose.Schema({
  floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
  unitNumber: String,
  bhkType: String, // e.g., 2BHK, 3BHK
  sizeSqFt: Number,
  facing: String,
   price: {
    totalPrice:    { type: Number },
    pricePerSqft:  { type: Number }
  },
  availability: {
    type: String,
    enum: ['available', 'booked', 'sold'],
    default: 'available'
  },
  photos:  [ unitMediaSchema ],
  videos: [ unitMediaSchema ],
  plan3D:  [ unitMediaSchema ],
  coordinates: {
    type: Map,
    of: [Number],
    default: {}
  },
  description: String
}, { timestamps: true });

module.exports = mongoose.model('Unit', unitSchema);