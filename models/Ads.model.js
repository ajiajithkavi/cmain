const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  image: {
    type: String, 
    required: true
  },
  redirectUrl: {
    type: String, // Where to go when clicked
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  position: {
    type: String,
    enum: ['homepage', 'sidebar', 'footer', 'popup'],
    default: 'homepage'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Advertisement', advertisementSchema);
