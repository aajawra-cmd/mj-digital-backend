const mongoose = require('mongoose');

const specificationSchema = new mongoose.Schema({
  key: { type: String, trim: true },
  value: { type: String, trim: true }
}, { _id: false });

const productSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Product title is required'],
    trim: true 
  },
  brand: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'] 
  },
  imageUrl: { 
    type: String, 
    default: '' 
  },
  images: [{ 
    type: String 
  }],
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: 0 
  },
  discountPrice: { 
    type: Number, 
    default: null 
  },
  stock: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out of stock', 'Active', 'Inactive', 'Out of Stock'],
    default: 'Active'
  },
  description: { 
    type: String, 
    default: '' 
  },
  detailedDescription: { 
    type: String, 
    default: '' 
  },
  variants: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  specifications: [specificationSchema]
}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);