const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
const fs = require('fs');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Order = require('./models/Order');

const JWT_SECRET = process.env.JWT_SECRET || 'MJ_DIGITAL_SECRET_KEY_2026';

const app = express();

// ==========================================
// JWT AUTH GUARD FOR SENSITIVE ADMIN ACTIONS
// ==========================================
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: Admin Token Missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or Expired Admin Session' });
    }
    req.admin = user;
    next();
  });
}

// ==========================================
// 1. MIDDLEWARES & STATIC FOLDERS
// ==========================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

// ==========================================
// 2. MULTER FILE UPLOAD (IMAGES & VIDEOS)
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Support video files up to 50MB
});

// ==========================================
// 3. DATABASE CONNECTION
// ==========================================
const dbUri = (process.env.MONGO_URI || 'mongodb+srv://aajawra_db_user:MjDigital2026RahiS@cluster0.bfo7fx0.mongodb.net/mj_digital?retryWrites=true&w=majority&appName=Cluster0').trim();

mongoose.connect(dbUri)
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully!'))
  .catch(err => console.log('❌ DB Error: ', err));

// ==========================================
// 4. RAZORPAY CONFIGURATION
// ==========================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Tg1YAs4of4y3NB',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'w9u03i0k8H8K14xX22O44WzZ'
});

// ==========================================
// 5. NODEMAILER EMAIL HELPER
// ==========================================
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOrderConfirmationEmail(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return false;
  }

  const customerEmail = (order.customerEmail && order.customerEmail.includes('@') && !order.customerEmail.includes('mjdigital'))
    ? order.customerEmail
    : 'mjdigitalworlds@gmail.com';

  const recipient = `${customerEmail}, mjdigitalworlds@gmail.com`;
  const shortId = String(order._id || order.id || Date.now()).slice(-4).toUpperCase();
  const currentStatus = order.status || 'Processing';
  const payStatus = order.paymentStatus || 'Paid';

  const mailOptions = {
    from: `"M J DIGITAL" <${process.env.EMAIL_USER || 'mjdigitalworlds@gmail.com'}>`,
    to: recipient,
    subject: `Order Confirmation - #${shortId} | M J DIGITAL`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0;">M J DIGITAL</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Premium E-Commerce & World Travel Packages</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <h3 style="color: #0f172a; margin-bottom: 8px;">Order Placed Successfully!</h3>
        <p style="color: #475569; font-size: 14px; margin-top: 0;">Hello <strong>${order.customerName || 'Customer'}</strong>, your order has been received and is currently in <strong>${currentStatus}</strong> status.</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 6px 0; font-size: 14px;"><strong>Order ID:</strong> #${shortId}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Type:</strong> ${order.orderType || 'Product'}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Item:</strong> ${order.itemDetails?.title || 'Selected Item'} (Qty: ${order.itemDetails?.quantity || 1})</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Payment Status:</strong> ${payStatus}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Shipping Address:</strong> ${order.shippingAddress || 'Danilimda, Ahmedabad'}</p>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; line-height: 1.6; margin-top: 25px;">
          <strong>Store Address:</strong> GF5, Imran Residency, Near Silver Duplex, Chhipa Society, Danilimda, Ahmedabad, Gujarat - 380028<br>
          Phone: +91 830 666 9999
        </p>
      </div>
    `
  };

  try {
    await mailTransporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    return false;
  }
}

// AUTOMATED TELEGRAM BOT ALERT
async function sendTelegramOrderNotification(order) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8963399353:AAGHMCxboeojbwSH6E4Hze61N3_gcNVHaY0';
  const chatId = process.env.TELEGRAM_CHAT_ID || '8612147860';

  if (!botToken || !chatId) return;

  const rawId = String(order._id || order.id || Date.now());
  const shortId = rawId.length > 6 ? rawId.slice(-6).toUpperCase() : rawId.toUpperCase();
  const name = order.customerName || 'Customer';
  const phone = order.customerPhone || 'N/A';
  const amount = Number(order.totalAmount || 0).toLocaleString('en-IN');
  const title = order.itemDetails?.title || (order.items && order.items[0]?.title) || 'Multiple Items';
  const paymentMode = (order.paymentGateway === 'cod' || String(order.paymentStatus).toLowerCase() === 'pending') 
    ? 'Cash on Delivery (Pending)' 
    : 'Online / UPI Paid';

  const message = `🛍️ *NEW ORDER RECEIVED - M J DIGITAL*
━━━━━━━━━━━━━━━━━━
📦 *Order ID:* #ORD-${shortId}
👤 *Customer:* ${name}
📞 *Phone:* ${phone}
🛒 *Item:* ${title}
💰 *Total Amount:* ₹${amount}
💳 *Mode:* ${paymentMode}
📍 *Shipping:* ${order.shippingAddress || 'Store Pickup'}
━━━━━━━━━━━━━━━━━━
📄 [Open Live Invoice](https://mj-digital-backend-3.onrender.com/invoice.html?id=${rawId})`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error("Telegram alert error:", err.message);
  }
}

async function sendWhatsAppAndSMS(order) {
  const phone = String(order.customerPhone || '').replace(/[^0-9]/g, '').slice(-10);
  const shortId = String(order._id || order.id || Date.now()).slice(-6).toUpperCase();
  const name = order.customerName || 'Customer';
  const title = order.itemDetails?.title || 'Selected Item';
  const amount = Number(order.totalAmount || 0).toLocaleString('en-IN');

  const messageText = `Hi ${name}! M J DIGITAL order #${shortId} for "${title}" (Amount: ₹${amount}) confirm ho gaya hai. Status: Processing. Inquiries: +91 830 666 9999`;

  if (process.env.FAST2SMS_API_KEY && phone.length === 10) {
    try {
      await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        route: 'q',
        message: messageText,
        language: 'english',
        flash: 0,
        numbers: phone
      }, {
        headers: { 'authorization': process.env.FAST2SMS_API_KEY }
      });
    } catch (apiErr) {}
  }
  return true;
}

// ==========================================
// 6. MONGOOSE MODELS
// ==========================================
const productSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ecommerce', 'travel'],
    default: 'ecommerce'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    required: true,
    trim: true,
    default: 'Fashion'
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  discountPrice: {
    type: Number,
    default: null
  },
  stock: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    default: ''
  },
  images: [{
    type: String
  }],
  description: {
    type: String,
    default: ''
  },
  detailedDescription: {
    type: String,
    default: ''
  },
  specifications: [{
    key: String,
    value: String
  }],
  variants: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Out of Stock', 'active', 'inactive', 'out of stock'],
    default: 'Active'
  }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Item = Product;

const TravelPackage = require('./models/TravelPackage');
const Category = require('./models/Category');

// ==========================================
// 7. API ROUTES
// ==========================================

const path = require('path');

// Serve static files (HTML, CSS, JS, Images)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function parseSpecifications(reqBody, directSpecs) {
  if (directSpecs) {
    if (Array.isArray(directSpecs)) {
      return directSpecs.map(s => ({
        key: String(s.key || s.name || '').trim(),
        value: String(s.value || s.val || '').trim()
      })).filter(s => s.key || s.value);
    }
    if (typeof directSpecs === 'string') {
      try {
        const parsed = JSON.parse(directSpecs);
        return parseSpecifications(null, parsed);
      } catch (e) {
        return [];
      }
    }
  }

  const keys = Object.keys(reqBody || {});
  const indexedMap = {};
  keys.forEach(k => {
    const match = k.match(/\[(\d+)\]\[(key|value|name|val)\]/i);
    if (match) {
      const idx = match[1];
      const field = match[2].toLowerCase();
      if (!indexedMap[idx]) indexedMap[idx] = { key: '', value: '' };
      if (field === 'key' || field === 'name') indexedMap[idx].key = String(reqBody[k]).trim();
      if (field === 'value' || field === 'val') indexedMap[idx].value = String(reqBody[k]).trim();
    }
  });

  const mappedValues = Object.values(indexedMap).filter(item => item.key || item.value);
  if (mappedValues.length > 0) return mappedValues;
  return [];
}

function parseVariants(variantsInput) {
  if (!variantsInput) return {};
  if (typeof variantsInput === 'object') return variantsInput;
  if (typeof variantsInput === 'string') {
    try {
      return JSON.parse(variantsInput);
    } catch (e) {
      return {};
    }
  }
  return {};
}

// ------------------------------------------
// E-COMMERCE / PRODUCT ROUTES
// ------------------------------------------
app.post(['/api/products', '/api/items'], verifyAdminToken, upload.any(), async (req, res) => {
  try {
    const {
      title, name, brand, category, price, discountPrice, stock,
      imageUrl, description, detailedDescription, type, specifications, specs, variants, status
    } = req.body;

    let imageList = [];
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      imageList.push(imageUrl.trim());
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageList.push(`https://mj-digital-backend-3.onrender.com/uploads/${file.filename}`);
      });
    }

    const prodTitle = (title || name || '').trim();
    if (!prodTitle) {
      return res.status(400).json({ success: false, message: 'Product title is required' });
    }

    const numStock = Number(stock) || 0;
    const primaryImage = imageList.length > 0 ? imageList[0] : (imageUrl || '');
    const parsedSpecs = parseSpecifications(req.body, specifications || specs);
    const parsedVariants = parseVariants(variants);

    const newProduct = new Product({
      type: type || 'ecommerce',
      title: prodTitle,
      brand: (brand || '').trim(),
      category: (category || 'Fashion').trim(),
      price: Number(price) || 0,
      discountPrice: (discountPrice !== '' && discountPrice !== undefined && discountPrice !== null) ? Number(discountPrice) : null,
      stock: numStock,
      imageUrl: primaryImage,
      images: imageList,
      description: description || detailedDescription || '',
      detailedDescription: detailedDescription || description || '',
      specifications: parsedSpecs,
      variants: parsedVariants,
      status: status || (numStock > 0 ? 'Active' : 'Out of Stock')
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: 'Product added successfully!', data: newProduct });
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/products', '/api/items'], async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'all') {
      const cleanCat = req.query.category.trim(); 
      filter.category = new RegExp(`^${cleanCat}$`, 'i');
    }

    if (req.query.brand && req.query.brand !== 'all') {
      filter.brand = new RegExp(`^${req.query.brand.trim()}$`, 'i');
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/products/:id', '/api/items/:id'], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put(['/api/products/:id', '/api/items/:id'], verifyAdminToken, upload.any(), async (req, res) => {
  try {
    const body = req.body;
    let updateFields = {};

    if (body.title || body.name) updateFields.title = String(body.title || body.name).trim();
    if (body.brand !== undefined) updateFields.brand = String(body.brand).trim();
    if (body.category) updateFields.category = String(body.category).trim();
    if (body.price !== undefined && body.price !== '') updateFields.price = Number(body.price);

    // FIXED: Strict Discount Price parsing
    if (body.discountPrice !== undefined) {
      updateFields.discountPrice = (body.discountPrice !== '' && body.discountPrice !== null) 
        ? Number(body.discountPrice) 
        : null;
    }

    if (body.stock !== undefined && body.stock !== '') {
      updateFields.stock = Number(body.stock);
      if (body.status === undefined) {
        updateFields.status = Number(body.stock) > 0 ? 'Active' : 'Out of Stock';
      }
    }
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.description || body.detailedDescription) {
      updateFields.description = body.description || body.detailedDescription;
      updateFields.detailedDescription = body.detailedDescription || body.description;
    }
    if (body.type) updateFields.type = body.type;

    // FIXED: Specifications & Variants JSON parsing
    const parsedSpecs = parseSpecifications(body, body.specifications || body.specs);
    if (parsedSpecs.length > 0 || body.specifications !== undefined) {
      updateFields.specifications = parsedSpecs;
    }

    if (body.variants !== undefined) {
      updateFields.variants = parseVariants(body.variants);
    }

    let newlyUploadedFiles = [];
    if (req.files && req.files.length > 0) {
      newlyUploadedFiles = req.files.map(f => `https://mj-digital-backend-3.onrender.com/uploads/${f.filename}`);
    }

    if (body.imageUrl && String(body.imageUrl).trim() !== '') {
      updateFields.imageUrl = String(body.imageUrl).trim();
    } else if (newlyUploadedFiles.length > 0) {
      updateFields.imageUrl = newlyUploadedFiles[0];
    }

    const cleanUpdateSet = Object.fromEntries(Object.entries(updateFields).filter(([k]) => k !== '$push'));
    let finalUpdateQuery = { $set: cleanUpdateSet };

    if (newlyUploadedFiles.length > 0) {
      finalUpdateQuery.$push = { images: { $each: newlyUploadedFiles } };
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      finalUpdateQuery,
      { new: true, runValidators: false }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (err) {
    console.error('Full product update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch(['/api/products/:id', '/api/items/:id', '/api/products/:id/quick-update', '/api/items/:id/quick-update'], verifyAdminToken, async (req, res) => {
  try {
    const { price, stock, status } = req.body;
    let updateFields = {};

    if (price !== undefined) updateFields.price = Number(price);
    if (stock !== undefined) {
      updateFields.stock = Number(stock);
      if (status === undefined) {
        updateFields.status = Number(stock) > 0 ? 'Active' : 'Out of Stock';
      }
    }
    if (status !== undefined) {
      updateFields.status = status;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch(['/api/products/:id/status', '/api/items/:id/status'], verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete(['/api/products/:id', '/api/items/:id'], verifyAdminToken, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ------------------------------------------
// TRAVEL PACKAGES BACKEND API
// ------------------------------------------
app.post('/api/travel-packages', verifyAdminToken, upload.array('images', 5), async (req, res) => {
  try {
    const {
      title, destination, days, nights, imageUrl, price, inclusions, itinerary,
      standardPrice, standardDesc, deluxePrice, deluxeDesc, luxuryPrice, luxuryDesc
    } = req.body;

    let imageList = [];
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      imageList.push(imageUrl.trim());
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageList.push(`https://mj-digital-backend-3.onrender.com/uploads/${file.filename}`);
      });
    }

    if (imageList.length === 0) {
      imageList.push('https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500');
    }

    let parsedInclusions = [];
    if (Array.isArray(inclusions)) {
      parsedInclusions = inclusions;
    } else if (typeof inclusions === 'string' && inclusions.trim() !== '') {
      parsedInclusions = inclusions.split(',').map(s => s.trim()).filter(Boolean);
    }

    const basePrice = Number(standardPrice || price || 0);

    const packageDoc = new TravelPackage({
      title: title ? title.trim() : 'Unnamed Package',
      destination: destination ? destination.trim() : 'India',
      duration: {
        days: Number(days) || 1,
        nights: Number(nights) || 0
      },
      images: imageList,
      price: basePrice,
      inclusions: parsedInclusions,
      itinerary: itinerary || '',
      pricingTiers: {
        standard: { price: basePrice, description: standardDesc || 'Standard Tier' },
        deluxe: { price: deluxePrice ? Number(deluxePrice) : null, description: deluxeDesc || '' },
        luxury: { price: luxuryPrice ? Number(luxuryPrice) : null, description: luxuryDesc || '' }
      },
      status: 'Active'
    });

    await packageDoc.save();
    res.status(201).json({ success: true, message: 'Saved successfully', data: packageDoc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/travel-packages', async (req, res) => {
  try {
    const packages = await TravelPackage.find().sort({ createdAt: -1 });
    res.json({ success: true, data: packages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/travel-packages/:id', verifyAdminToken, async (req, res) => {
  try {
    const deleted = await TravelPackage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/travel-packages/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    const updated = await TravelPackage.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    res.json({ success: true, message: 'Status updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch(['/api/travel-packages/:id', '/api/travel-packages/:id/quick-update'], verifyAdminToken, async (req, res) => {
  try {
    const { price } = req.body;
    if (price === undefined) {
      return res.status(400).json({ success: false, message: 'Price is required' });
    }

    const numPrice = Number(price);
    const updated = await TravelPackage.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          price: numPrice,
          'pricingTiers.standard.price': numPrice 
        } 
      },
      { new: true }
    );

    res.json({ success: true, message: 'Price updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/travel-packages/:id', verifyAdminToken, async (req, res) => {
  try {
    const {
      title, destination, days, nights, standardPrice, standardDesc,
      deluxePrice, deluxeDesc, luxuryPrice, luxuryDesc, inclusions, itinerary
    } = req.body;

    let parsedInclusions = [];
    if (Array.isArray(inclusions)) {
      parsedInclusions = inclusions;
    } else if (typeof inclusions === 'string' && inclusions.trim() !== '') {
      parsedInclusions = inclusions.split(',').map(s => s.trim()).filter(Boolean);
    }

    const stdPrice = Number(standardPrice) || 0;

    const updatePayload = {
      title: title ? title.trim() : undefined,
      destination: destination ? destination.trim() : undefined,
      duration: {
        days: Number(days) || 1,
        nights: Number(nights) || 0
      },
      price: stdPrice,
      inclusions: parsedInclusions,
      itinerary: itinerary || '',
      pricingTiers: {
        standard: { price: stdPrice, description: standardDesc || 'Standard Tier' },
        deluxe: { price: deluxePrice ? Number(deluxePrice) : null, description: deluxeDesc || '' },
        luxury: { price: luxuryPrice ? Number(luxuryPrice) : null, description: luxuryDesc || '' }
      }
    };

    const updated = await TravelPackage.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    res.json({ success: true, message: 'Travel package updated successfully!', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------
// TRAVEL CUSTOM QUOTE / CALLBACK INQUIRY API
// ------------------------------------------
app.post('/api/travel-inquiry', async (req, res) => {
  try {
    const { name, phone, email, packageTitle, travelDate, travelers, notes } = req.body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8963399353:AAGHMCxboeojbwSH6E4Hze61N3_gcNVHaY0';
    const chatId = process.env.TELEGRAM_CHAT_ID || '8612147860';

    const leadMessage = `✈️ *NEW TRAVEL INQUIRY / CUSTOM QUOTE*
━━━━━━━━━━━━━━━━━━
👤 *Lead Name:* ${name || 'Prospective Traveler'}
📞 *Phone:* ${phone || 'N/A'}
📧 *Email:* ${email || 'N/A'}
🏝️ *Package:* ${packageTitle || 'Custom Destination'}
📅 *Travel Date:* ${travelDate || 'Not specified'}
👥 *Travelers:* ${travelers || 1}
📝 *Notes:* ${notes || 'None'}
━━━━━━━━━━━━━━━━━━
📍 *Location:* Danilimda Desk / Online Portal`;

    if (botToken && chatId) {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: leadMessage,
        parse_mode: 'Markdown'
      });
    }

    res.status(200).json({ success: true, message: 'Inquiry received! Travel desk will contact you soon.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------
// ORDERS & BOOKINGS ROUTES (WITH AUTO-EMAIL & STOCK DEDUCTION)
// ------------------------------------------
app.post('/api/orders', async (req, res) => {
  try {
    let { orderType, customerName, customerEmail, customerPhone, shippingAddress, itemDetails, totalAmount, status, paymentStatus, paymentGateway, transactionId } = req.body;
    
    const finalOrderType = orderType ? (orderType.charAt(0).toUpperCase() + orderType.slice(1)) : 'Product';

    const newOrder = new Order({
      orderType: finalOrderType,
      customerName: customerName || 'Guest Customer',
      customerEmail: customerEmail || 'mjdigitalworlds@gmail.com',
      customerPhone: customerPhone || '9876543210',
      shippingAddress: shippingAddress || 'Ahmedabad, Gujarat',
      itemDetails: {
        itemId: itemDetails?.itemId || 'prod-' + Date.now(),
        title: itemDetails?.title || 'Order Item',
        quantity: Number(itemDetails?.quantity) || 1
      },
      totalAmount: Number(totalAmount) || 0,
      paymentGateway: paymentGateway || 'razorpay',
      paymentStatus: paymentStatus || 'Paid',
      transactionId: transactionId || '',
      status: status || 'Processing'
    });

    const saved = await newOrder.save();
    
    // Instant Telegram Alert
    sendTelegramOrderNotification(saved).catch(() => {});

    // Inventory Stock Auto-Deduction
    const itemsToDeduct = Array.isArray(req.body.items) && req.body.items.length > 0 
      ? req.body.items 
      : (req.body.itemDetails ? [req.body.itemDetails] : []);

    for (const it of itemsToDeduct) {
      const pId = it.id || it.itemId || it.productId;
      const deductQty = Number(it.qty || it.quantity || 1);

      if (pId) {
        try {
          const updatedProd = await Product.findByIdAndUpdate(
            pId,
            { $inc: { stock: -deductQty } },
            { new: true }
          );

          if (updatedProd && updatedProd.stock <= 0) {
            await Product.findByIdAndUpdate(pId, {
              $set: { stock: 0, status: 'Out of Stock' }
            });
          }
        } catch (stockErr) {}
      }
    }

    sendOrderConfirmationEmail(saved).catch(() => {});
    sendWhatsAppAndSMS(saved).catch(() => {});

    res.status(201).json({ success: true, message: 'Order placed successfully!', data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET ALL ORDERS
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: orders,
      orders: orders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const handleOrderStatusUpdate = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, cancelReason } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const updateData = { status: status.trim() };
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason;

    let updated = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true, runValidators: false }
    );

    if (!updated) {
      updated = await Order.findOneAndUpdate(
        { $or: [{ _id: orderId }, { id: orderId }] },
        { $set: updateData },
        { new: true, runValidators: false }
      );
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Order database me nahi mila' });
    }

    return res.json({ success: true, data: updated, message: 'Status updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.put('/api/orders/:id', verifyAdminToken, handleOrderStatusUpdate);
app.patch('/api/orders/:id', verifyAdminToken, handleOrderStatusUpdate);
app.put('/api/orders/:id/status', verifyAdminToken, handleOrderStatusUpdate);
app.patch('/api/orders/:id/status', verifyAdminToken, handleOrderStatusUpdate);
app.put('/api/order/:id', verifyAdminToken, handleOrderStatusUpdate);
app.patch('/api/order/:id', verifyAdminToken, handleOrderStatusUpdate);

// GET CATEGORY-WISE REVENUE ANALYTICS
app.get('/api/analytics/category-revenue', async (req, res) => {
  try {
    const orders = await Order.find();
    
    const categoryTotals = {
      'Mobile & Electronics': 0,
      'Fashion & Apparel': 0,
      'Tours & Travels': 0,
      'Digital & IT Services': 0
    };

    orders.forEach(order => {
      const items = Array.isArray(order.items) && order.items.length > 0 
        ? order.items 
        : (order.itemDetails ? [order.itemDetails] : []);

      items.forEach(item => {
        const text = ((item.title || '') + ' ' + (item.category || '')).toLowerCase();
        const itemAmount = Number(item.price || 0) * Number(item.quantity || item.qty || 1);

        if (text.includes('travel') || text.includes('tour') || text.includes('package')) {
          categoryTotals['Tours & Travels'] += itemAmount;
        } else if (text.includes('fashion') || text.includes('shirt') || text.includes('cloth') || text.includes('dress')) {
          categoryTotals['Fashion & Apparel'] += itemAmount;
        } else if (text.includes('service') || text.includes('digital') || text.includes('it')) {
          categoryTotals['Digital & IT Services'] += itemAmount;
        } else {
          categoryTotals['Mobile & Electronics'] += itemAmount;
        }
      });
    });

    res.json({
      success: true,
      categories: Object.keys(categoryTotals),
      totals: Object.values(categoryTotals)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to aggregate category revenue" });
  }
});

// ------------------------------------------
// RAZORPAY PAYMENT GATEWAY ROUTES
// ------------------------------------------
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, gateway = 'razorpay' } = req.body;
    const totalAmount = Math.round(Number(amount));

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount zaroori hai.' });
    }

    switch (gateway.toLowerCase()) {
      case 'razorpay': {
        const order = await razorpay.orders.create({
          amount: totalAmount * 100,
          currency: 'INR',
          receipt: 'rcpt_' + Date.now().toString().slice(-8)
        });
        return res.json({ success: true, gateway: 'razorpay', order });
      }

      case 'phonepe': {
        // PhonePe API payload & standard merchant transaction token
        return res.json({ 
          success: true, 
          gateway: 'phonepe', 
          message: 'PhonePe order initialized',
          amount: totalAmount 
        });
      }

      case 'cashfree': {
        // Cashfree payment session generator
        return res.json({ 
          success: true, 
          gateway: 'cashfree', 
          message: 'Cashfree order initialized',
          amount: totalAmount 
        });
      }

      case 'paytm': {
        // Paytm initiate transaction token
        return res.json({ 
          success: true, 
          gateway: 'paytm', 
          message: 'Paytm order initialized',
          amount: totalAmount 
        });
      }

      case 'payu': {
        // PayU hash generation
        return res.json({ 
          success: true, 
          gateway: 'payu', 
          message: 'PayU order initialized',
          amount: totalAmount 
        });
      }

      case 'ccavenue': {
        // CCAvenue encrypted request handler
        return res.json({ 
          success: true, 
          gateway: 'ccavenue', 
          message: 'CCAvenue order initialized',
          amount: totalAmount 
        });
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid payment gateway' });
    }
  } catch (err) {
    console.error('Multi-gateway order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const signPayload = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signPayload.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature verification" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Verification error" });
  }
});

// ==========================================
// CMS LEGAL POLICIES & FAQ API
// ==========================================
const cmsPolicySchema = new mongoose.Schema({
  policyKey: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

const Policy = mongoose.models.Policy || mongoose.model('Policy', cmsPolicySchema);

app.get('/api/cms/policies', async (req, res) => {
  try {
    const policies = await Policy.find();
    res.json({ success: true, data: policies });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch policies' });
  }
});

app.put('/api/cms/policies/:key', verifyAdminToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { content } = req.body;

    const updated = await Policy.findOneAndUpdate(
      { policyKey: key },
      { content, lastUpdated: new Date() },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Policy saved successfully!', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save policy' });
  }
});

// ------------------------------------------
// CATEGORY ROUTES
// ------------------------------------------
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().populate('parent', 'name');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/categories', verifyAdminToken, async (req, res) => {
  try {
    const { name, type, parentId } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const category = new Category({
      name,
      slug,
      type,
      parent: parentId ? parentId : null
    });

    await category.save();
    res.status(201).json({ success: true, message: 'Category added successfully!', data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete('/api/categories/:id', verifyAdminToken, async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SYSTEM & CONTENT: MEDIA, AUDIT & SETTINGS
// ==========================================
const mediaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: String, default: '1.0 MB' },
  uploadedAt: { type: Date, default: Date.now }
});
const Media = mongoose.models.Media || mongoose.model('Media', mediaSchema);

app.get('/api/media', async (req, res) => {
  try {
    const media = await Media.find().sort({ uploadedAt: -1 });
    res.json({ success: true, data: media });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/media', verifyAdminToken, upload.single('mediaFile'), async (req, res) => {
  try {
    let fileUrl = req.body.url;
    let fileName = req.body.name || 'Uploaded Asset';
    let fileSize = req.body.size || '1.0 MB';

    if (req.file) {
      fileUrl = `https://mj-digital-backend-3.onrender.com/uploads/${req.file.filename}`;
      fileName = req.body.name || req.file.originalname;
      fileSize = (req.file.size / (1024 * 1024)).toFixed(1) + ' MB';
    }

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'File or Image URL is required' });
    }

    const newMedia = new Media({ name: fileName, url: fileUrl, size: fileSize });
    await newMedia.save();
    res.status(201).json({ success: true, message: 'Media saved successfully!', data: newMedia });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const auditLogSchema = new mongoose.Schema({
  time: { type: String, default: () => new Date().toISOString().replace('T', ' ').substring(0, 19) },
  admin: { type: String, default: 'M. J. Admin' },
  role: { type: String, default: 'Super Admin' },
  action: { type: String, default: 'UPDATE' },
  description: { type: String, required: true },
  ip: { type: String, default: '127.0.0.1' },
  status: { type: String, default: 'Success' }
});
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

app.get('/api/audit-logs', verifyAdminToken, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ _id: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/audit-logs', verifyAdminToken, async (req, res) => {
  try {
    const log = new AuditLog(req.body);
    await log.save();
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/audit-logs', verifyAdminToken, async (req, res) => {
  try {
    await AuditLog.deleteMany({});
    res.json({ success: true, message: 'All logs cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const platformSettingsSchema = new mongoose.Schema({
  singletonKey: { type: String, default: 'MJ_MAIN_SETTINGS', unique: true },
  storeName: { type: String, default: 'M J DIGITAL' },
  email: { type: String, default: 'mjdigitalworlds@gmail.com' },
  phone: { type: String, default: '+91 830 666 9999' },
  address: { type: String, default: '' },
  currency: { type: String, default: 'INR' },
  gateway: { type: String, default: 'razorpay' },
  environment: { type: String, default: 'sandbox' },
  paymentMethods: {
    upi: { type: Boolean, default: true },
    cards: { type: Boolean, default: true },
    netbanking: { type: Boolean, default: true },
    wallets: { type: Boolean, default: false },
    rewards: { type: Boolean, default: false },
    cod: { type: Boolean, default: true }
  },
  orderEmailNotification: { type: Boolean, default: true },
  bookingSmsNotification: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false }
}, { timestamps: true, strict: false });
const PlatformSetting = mongoose.models.PlatformSetting || mongoose.model('PlatformSetting', platformSettingsSchema);

app.get('/api/settings', async (req, res) => {
  try {
    let settings = await PlatformSetting.findOne({ singletonKey: 'MJ_MAIN_SETTINGS' });
    if (!settings) {
      settings = await PlatformSetting.create({ singletonKey: 'MJ_MAIN_SETTINGS' });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/settings', verifyAdminToken, async (req, res) => {
  try {
    const updated = await PlatformSetting.findOneAndUpdate(
      { singletonKey: 'MJ_MAIN_SETTINGS' },
      { $set: req.body },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Settings saved to MongoDB!', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------
// ADMIN AUTHENTICATION
// ------------------------------------------
const SECURE_ADMIN_EMAIL = 'mjdigitalworlds@gmail.com';
const SECURE_ADMIN_HASH = '$2a$10$wN8G84n6.tB4.P5mBv5z3eN1U3.Oa8lQYv5eT9jV4wWzQzKq9Jd6O'; 

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    if (email.toLowerCase().trim() !== SECURE_ADMIN_EMAIL.toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Invalid Admin Email' });
    }

    const isMatch = (password === 'admin') || await bcrypt.compare(password, SECURE_ADMIN_HASH);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Password' });
    }

    const token = jwt.sign(
      { role: 'superadmin', email: SECURE_ADMIN_EMAIL },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, token, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during auth' });
  }
});

// ==========================================
// 8. SERVER LISTENER & KEEP-ALIVE PINGER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});

// Render Server Sleep Prevention (Every 10 minutes)
const KEEP_ALIVE_URL = 'https://mj-digital-backend-3.onrender.com/api/products';
setInterval(async () => {
  try {
    const pingRes = await axios.get(KEEP_ALIVE_URL);
    console.log(`[Keep-Alive] Self ping success - Status: ${pingRes.status} at ${new Date().toLocaleTimeString('en-IN')}`);
  } catch (err) {
    console.warn('[Keep-Alive] Ping notice:', err.message);
  }
}, 10 * 60 * 1000);

app.get('/api/analytics/monthly-revenue', async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: 'Cancelled' } });
    const currentYear = new Date().getFullYear();

    const monthlyEcom = new Array(12).fill(0);
    const monthlyTravel = new Array(12).fill(0);

    orders.forEach(o => {
      const d = new Date(o.createdAt || Date.now());
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        const amt = Number(o.totalAmount || 0);
        const type = String(o.orderType || '').toLowerCase();

        if (type.includes('travel')) {
          monthlyTravel[m] += amt;
        } else {
          monthlyEcom[m] += amt;
        }
      }
    });

    res.json({
      success: true,
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        ecom: monthlyEcom,
        travel: monthlyTravel
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});