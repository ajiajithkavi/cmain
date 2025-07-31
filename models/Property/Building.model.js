const mongoose = require('mongoose');

const locationAdvantageSchema = new mongoose.Schema({
  place: String,
  distance: String
}, { _id: false });

const floorPlanSchema = new mongoose.Schema({
  unit: [String],   // image URLs
  clubhousePlans: [String],
  masterplans: [String]
}, { _id: false });

const gallerySchema = new mongoose.Schema({
  elevation: [String],     // image URLs
  interiors: [String],
  amenities: [String],
  siteProgress: [String],
  walkthrough: [String]
}, { _id: false });

const configurationDetailSchema = new mongoose.Schema({
  bhk: String,
  unitType: String,
  builtUpArea: String,
  pricePerSqft: String,
  priceRange: String
}, { _id: false });

const configurationSchema = new mongoose.Schema({
  marketPrice: String,
  casagrandPrice: String,
  offerPrice: String,
  apartmentConfigs: [configurationDetailSchema]
}, { _id: false });

const buildingSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  buildingName: { type: String, required: true },
  floorsCount: Number,
  amenities: [String],
  photos: [String],
  videos: [String],
  description: String,
  mapViewUrl: { type: String },

  buildingArea: String,
  priceRange: String,
  units: Number,
  type: { type: String }, // "Residential", "Commercial"

  salientFeatures: [String], // Bullet points
  projectOverview: String,
  
  locationAdvantages: [locationAdvantageSchema],
  locationMapImage: String,

  floorPlans: floorPlanSchema,
  gallery: gallerySchema,

  configuration: configurationSchema

}, { timestamps: true });

module.exports = mongoose.model('Building', buildingSchema);
