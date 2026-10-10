const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const Order = require('./models/Order');
const TravelPackage = require('./models/TravelPackage');
const Category = require('./models/Category');

const JWT_SECRET = process.env.JWT_SECRET || 'MJ_DIGITAL_SECRET_KEY_2026';

const app = express();

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

// Serve frontend static files
app.use(express.static(__dirname));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
  limits: { fileSize: 50 * 1024 * 1024 }
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
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TkFr9r722bHvjA',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'J16v2NqMS2bmmlSBSjjem2vB'
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

// ==========================================
// 7. API ROUTES
// ==========================================
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
    const match = k.match(/\[(\d+)\]\[(key\vert{}value\vert{}name\vert{}val)\]/i);
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
      finalUpdateQuery.$push = { images: {$each: newlyUploadedFiles } };
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
    if (status !== undefined) updateFields.status = status;

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
// ORDERS & BOOKINGS ROUTES
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

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders, orders });
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

// ------------------------------------------
// RAZORPAY PAYMENT GATEWAY ROUTES
// ------------------------------------------
app.post(['/api/create-order', '/api/payment/create-order'], async (req, res) => {
  try {
    const { amount, gateway = 'razorpay' } = req.body;
    const totalAmount = Math.round(Number(amount));

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount zaroori hai.' });
    }

    if (gateway.toLowerCase() === 'razorpay') {
      const order = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: 'INR',
        receipt: 'rcpt_' + Date.now().toString().slice(-8)
      });
      return res.json({ success: true, gateway: 'razorpay', order_id: order.id, order });
    }

    return res.json({
      success: true,
      gateway,
      message: `${gateway} order initialized`,
      amount: totalAmount
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post(['/api/verify-payment', '/api/payment/verify'], async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing required signature fields" });
    }

    const signPayload = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'J16v2NqMS2bmmlSBSjjem2vB')
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

// ------------------------------------------
// SETTINGS & PLATFORM CONFIGURATION
// ------------------------------------------
const platformSettingsSchema = new mongoose.Schema({
  singletonKey: { type: String, default: 'MJ_MAIN_SETTINGS', unique: true },
  storeName: { type: String, default: 'M J DIGITAL' },
  email: { type: String, default: 'mjdigitalworlds@gmail.com' },
  phone: { type: String, default: '+91 830 666 9999' },
  address: { type: String, default: '' }
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

// ==========================================
// 8. SERVER LISTENER
// ==========================================
const PORT = process.env.PORT || 5000;
// --- SPA REFRESH CATCH-ALL ROUTE ---
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const targetIndex = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
    ? path.join(__dirname, 'public', 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(targetIndex);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
