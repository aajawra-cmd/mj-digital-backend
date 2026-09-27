const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer: {
        name: { type: String },
        email: { type: String },
        phone: { type: String }
    },
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    shippingAddress: { type: String },
    orderType: { type: String, default: 'Product' },
    itemDetails: {
        itemId: { type: String, default: () => 'prod-' + Date.now() },
        title: { type: String, default: 'Order Item' },
        quantity: { type: Number, default: 1 }
    },
    totalAmount: { type: Number, required: true },
    paymentGateway: { type: String, default: 'razorpay' },
    paymentStatus: {
        type: String,
        default: 'Paid'
    },
    status: {
        type: String,
        enum: [
            'Pending', 
            'Processing', 
            'Confirmed', 
            'In Transit', 
            'Delivered', 
            'Cancelled',
            'pending',
            'processing',
            'confirmed',
            'in transit',
            'delivered',
            'cancelled'
        ],
        default: 'Processing'
    },
    cancelReason: {
        type: String,
        default: ''
    },
    transactionId: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);