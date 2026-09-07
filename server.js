const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mjdigitalDB')
    .then(() => console.log('✅ Database Connected'))
    .catch(err => console.log('❌ DB Error: ', err));

// 1. Universal Product & Travel Package Schema
const ItemSchema = new mongoose.Schema({
    type: { type: String, enum: ['Product', 'Travel'], required: true },
    category: { type: String, enum: ['Mobile', 'Travels', 'Fashion', 'Electronics', 'Services'], required: true },
    
    // Common Fields
    title: String,
    price: Number,
    originalPrice: Number,
    discountPercent: Number,
    images: [String],
    description: String,
    isLive: { type: Boolean, default: true },

    // Travels Specific
    destinationType: { type: String, enum: ['International', 'India'] },
    destinationName: String, // e.g. Singapore, Dubai, Goa
    activities: [String],
    timeSlots: [String],
    
    // Mobile / Electronics Specific Specs
    brand: String,
    modelName: String,
    screenSize: String,
    color: String,
    storageSize: String,
    cpuModel: String,
    ramSize: String,
    os: String,
    specialFeatures: String,
    graphicsCard: String,

    createdAt: { type: Date, default: Date.now }
});

// 2. Order & Booking Flow Schema
const OrderSchema = new mongoose.Schema({
    orderType: String, // 'Travel Booking' or 'Product Order'
    customer: {
        name: String,
        email: String,
        mobile: String,
        address: {
            street: String,
            city: String,
            state: String,
            pincode: String
        }
    },
    items: Array, // Product details or Travel Details (Travelers count, Slot date/time)
    totalAmount: Number,
    paymentStatus: { type: String, default: 'Pending' }, // 'Paid', 'COD', 'Pending'
    orderStatus: { type: String, default: 'Confirmed' },
    createdAt: { type: Date, default: Date.now }
});

// 3. Admin Legal Pages & Policy Settings
const PolicySchema = new mongoose.Schema({
    privacyPolicy: String,
    termsAndConditions: String,
    refundPolicy: String
});

const Item = mongoose.model('Item', ItemSchema);
const Order = mongoose.model('Order', OrderSchema);
const Policy = mongoose.model('Policy', PolicySchema);

// --- API ROUTES ---

// Save / Update Item (Product or Travel)
app.post('/api/admin/items', async (req, res) => {
    try {
        const item = new Item(req.body);
        await item.save();
        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Items by Category / Destination Filter
app.get('/api/items', async (req, res) => {
    try {
        const filter = {};
        if (req.query.category) filter.category = req.query.category;
        if (req.query.destinationType) filter.destinationType = req.query.destinationType;
        if (req.query.brand) filter.brand = req.query.brand;

        const items = await Item.find(filter);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Policies
app.post('/api/admin/policies', async (req, res) => {
    try {
        let policy = await Policy.findOne();
        if (!policy) policy = new Policy();
        
        policy.privacyPolicy = req.body.privacyPolicy;
        policy.termsAndConditions = req.body.termsAndConditions;
        policy.refundPolicy = req.body.refundPolicy;
        
        await policy.save();
        res.json({ success: true, message: "Policies updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(5000, () => console.log('🚀 Backend running on port 5000'));