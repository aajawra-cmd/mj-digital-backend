const mongoose = require('mongoose');

// 1. CMS Policies Schema
const policySchema = new mongoose.Schema({
    policyKey: { type: String, required: true, unique: true }, // 'terms', 'privacy', 'refund', 'additional', 'faq'
    content: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now }
});

// 2. Media Library Schema
const mediaSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: String, default: '1.0 MB' },
    uploadedAt: { type: Date, default: Date.now }
});

// 3. Audit Activity Logs Schema
const auditLogSchema = new mongoose.Schema({
    admin: { type: String, default: 'M. J. Admin' },
    role: { type: String, default: 'Super Admin' },
    action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'AUTH'], required: true },
    description: { type: String, required: true },
    ip: { type: String, default: '127.0.0.1' },
    status: { type: String, enum: ['Success', 'Warning', 'Danger'], default: 'Success' },
    time: { type: Date, default: Date.now }
});

// 4. Platform Settings Schema
const platformSettingsSchema = new mongoose.Schema({
    singletonId: { type: String, default: 'mj_platform_main_config', unique: true },
    storeName: { type: String, default: 'M J DIGITAL' },
    email: { type: String, default: 'support@mjdigital.in' },
    phone: { type: String, default: '+91 830 666 9999' },
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
}, { timestamps: true });

const Policy = mongoose.models.Policy || mongoose.model('Policy', policySchema);
const Media = mongoose.models.Media || mongoose.model('Media', mediaSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
const PlatformSetting = mongoose.models.PlatformSetting || mongoose.model('PlatformSetting', platformSettingsSchema);

module.exports = { Policy, Media, AuditLog, PlatformSetting };