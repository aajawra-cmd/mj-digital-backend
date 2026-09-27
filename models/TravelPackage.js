const mongoose = require('mongoose');

const travelPackageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  duration: {
    days: { type: Number, required: true },
    nights: { type: Number, required: true }
  },
  images: [{ type: String }], // URLs + Local upload paths store honge
  inclusions: [{ type: String }],
  itinerary: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Coming Soon'],
    default: 'Active'
  },
  pricingTiers: {
    standard: {
      price: { type: Number, required: true },
      description: { type: String, default: '' }
    },
    deluxe: {
      price: { type: Number, default: null },
      description: { type: String, default: '' }
    },
    luxury: {
      price: { type: Number, default: null },
      description: { type: String, default: '' }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('TravelPackage', travelPackageSchema);