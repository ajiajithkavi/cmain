const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url:   { type: String, required: true },
  type:  { type: String, required: true },
  title: { type: String }
});

const builderProfileSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName:     { type: String, required: true },
  tagline:         { type: String },
  logo:            { type: String },           
  coverPhotos:     [ mediaSchema ],            
  gallery:         [ mediaSchema ],          
  website:         { type: String },
  email:           { type: String },
  phone:           { type: String },
  address: {
    street:        { type: String },
    city:          { type: String },
    state:         { type: String },
    pincode:       { type: String }
  },
  description:     { type: String },
  features:        [ String ],                  // e.g. ["RERA Registered", "25+ yrs experience"]
  servicesOffered: [ String ],                  // e.g. ["Apartments","Plots","Villas"]
  socialLinks: {
    facebook:      { type: String },
    linkedin:      { type: String },
    instagram:     { type: String },
    youtube:       { type: String }
  },
  supportInfo: {
    contactPerson: { type: String },
    supportEmail:  { type: String },
    supportPhone:  { type: String }
  },
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('BuilderProfile', builderProfileSchema);
