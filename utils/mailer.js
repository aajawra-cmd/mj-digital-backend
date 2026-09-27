const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendOrderNotificationEmail(order) {
    try {
        const mailOptions = {
            from: `"M J DIGITAL" <${process.env.EMAIL_USER}>`,
            to: `${order.customerEmail}, ${process.env.EMAIL_USER}`, // Dono ko bhejega (Customer + Store Owner)
            subject: `Order Confirmation - #${String(order._id).slice(-4).toUpperCase()} | M J DIGITAL`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #2563eb; text-align: center; margin-bottom: 5px;">M J DIGITAL</h2>
                    <p style="text-align: center; color: #64748b; font-size: 13px; margin-top: 0;">E-Commerce & Travel Experiences</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    
                    <h3 style="color: #0f172a;">Thank You for Your Order, ${order.customerName}!</h3>
                    <p style="color: #334155;">Your order has been received and is currently <strong>${order.status}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Order ID:</strong> #${String(order._id).slice(-4).toUpperCase()}</p>
                        <p style="margin: 5px 0;"><strong>Item:</strong> ${order.itemDetails?.title || 'Selected Item'}</p>
                        <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}</p>
                        <p style="margin: 5px 0;"><strong>Payment Status:</strong> ${order.paymentStatus} (${order.paymentGateway})</p>
                        <p style="margin: 5px 0;"><strong>Delivery Address:</strong> ${order.shippingAddress}</p>
                    </div>

                    <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
                        M J DIGITAL • GF5, Imran Residency, Danilimda, Ahmedabad, Gujarat - 380028<br>
                        Support Phone: +91 830 666 9999
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully: " + info.messageId);
        return true;
    } catch (err) {
        console.error("Nodemailer Error:", err);
        return false;
    }
}

module.exports = { sendOrderNotificationEmail };