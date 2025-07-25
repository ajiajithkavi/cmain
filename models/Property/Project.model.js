
const mongoose = require('mongoose');


const projectMediaSchema = new mongoose.Schema({
  url:   { type: String, required: true },
  type:  { type: String,  required: true },
  title: { type: String }
});


const projectSchema = new mongoose.Schema({
  builder: { type: mongoose.Schema.Types.ObjectId, ref: 'BuilderProfile', required: true },
  projectName: { type: String, required: true },
  location: {
    city: String,
    area: String,
    pincode: String
  },
  propertyType: {
    type: String,
    enum: ['Plot', 'Apartment', 'Villa', 'Commercial'],
    required: true
  },
   type: {
    type: String, 
  },
  status: {
    type: String, // Example: "Ready to move", "Under construction"
   
  },
  price: {
    type: Number,
    
  },
  bed: {
    type: Number,
    
  },
  bath: {
    type: Number,
    
  },
  sqft: {
    type: Number,
   
  },
  units: {
    type: Number
  },
  kitchen: {
    type: String 
  },
  carpetArea: {
    type: String // E.g., "1800 sqft"
  },
  mapViewUrl: {
    type: String
  },
  phase: {
    type: String
  },
  floor: {
    type: String // Floor number or range
  },
  loanDetails: {
    type: String
  },
  downPayment: {
    type: Number
  },
 possessionDate: {
  type: mongoose.Schema.Types.Mixed,   
  required: true,
},

  description: {
    type: String,
    required: true
  },
  amenities: [String],
  specifications: {
    type: String
  },
  media: {
    photos: [ projectMediaSchema ],
    videos:  [ projectMediaSchema ],
    threeDVideo:  [ projectMediaSchema ]
  },
 
  followedCount: { type: Number, default: 0 },
 createdAt:        { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);