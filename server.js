const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://aajawra_db_user:r27VmhH7bfMdfhof@mj.qwqplci.mongodb.net/leadDB?retryWrites=true&w=majority&appName=MJ";

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ DB Connection Failed:', err.message));

// Schemas
const LeadSchema = new mongoose.Schema({
    name: String, email: String, phone: String, service: String, message: String,
    createdAt: { type: Date, default: Date.now }
});

const ItemSchema = new mongoose.Schema({
    title: String,
    category: String, // 'Product' ya 'Package'
    price: String,
    duration: String, // Packages ke liye
    description: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model('Lead', LeadSchema);
const Item = mongoose.model('Item', ItemSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Page Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// --- API ROUTES ---

// Leads API
app.post('/api/leads/submit', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: "Database connected nahi hai." });
        }
        const { name, email, phone, service, message } = req.body;
        const newLead = new Lead({ name, email, phone, service, message });
        await newLead.save();
        
        res.json({ success: true, message: 'Lead saved successfully!' });

        Promise.all([
            transporter.sendMail({
                from: process.env.EMAIL_USER, to: process.env.ADMIN_EMAIL,
                subject: `🚨 New Lead: ${name}`,
                html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Service:</strong> ${service}</p><p><strong>Message:</strong> ${message}</p>`
            }),
            transporter.sendMail({
                from: process.env.EMAIL_USER, to: email,
                subject: `Thank you for contacting us, ${name}!`,
                html: `<p>Hi ${name},</p><p>We received your request for <strong>${service}</strong>.</p>`
            })
        ]).catch(err => console.log('Mail error:', err.message));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/leads', async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/leads/:id', async (req, res) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Lead deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Items API (Products & Packages)
app.post('/api/items', async (req, res) => {
    try {
        const { title, category, price, duration, description, imageUrl } = req.body;
        const newItem = new Item({ title, category, price, duration, description, imageUrl });
        await newItem.save();
        res.json({ success: true, message: 'Item added successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/items/:id', async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Item deleted successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'admin-secret-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Credentials!' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));