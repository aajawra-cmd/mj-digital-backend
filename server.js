const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('.'));

// MongoDB Connection Link with Timeout Control
const MONGO_URI = "mongodb+srv://aajawra_db_user:hk42lwxtS0Fey3JQ@mj.qwqplci.mongodb.net/leadDB?retryWrites=true&w=majority&appName=MJ";

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // 5 sec se zyaada wait nahi karega
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
    console.error('❌ DB Connection Failed:', err.message);
    console.error('👉 Tip: Mobile Hotspot se connect karke check karein agar ISP block kar raha hai.');
});

// Lead Schema
const LeadSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    service: String,
    message: String,
    createdAt: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Submit Route
app.post('/api/leads/submit', async (req, res) => {
    try {
        // Agar DB ready nahi hai toh buffering rukwane ke liye check
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: "Database connected nahi hai. Terminal me error check karein." 
            });
        }

        const { name, email, phone, service, message } = req.body;
        const newLead = new Lead({ name, email, phone, service, message });
        await newLead.save();

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.ADMIN_EMAIL,
                subject: `🚨 New Lead: ${name}`,
                html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Service:</strong> ${service}</p><p><strong>Message:</strong> ${message}</p>`
            });

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Thank you for contacting us, ${name}!`,
                html: `<p>Hi ${name},</p><p>We received your request for <strong>${service}</strong>.</p>`
            });
        } catch (mailError) {
            console.log('⚠️ Lead saved, Email failed:', mailError.message);
        }

        res.json({ success: true, message: 'Lead saved successfully!' });

    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Leads Route
app.get('/api/leads', async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// Admin Login Route
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // Aap apna Admin Username aur Password yahan set kar sakte hain:
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'admin-secret-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Username or Password!' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));