const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/mj_digital')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

const cmsPolicySchema = new mongoose.Schema({
  policyKey: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

const Policy = mongoose.models.Policy || mongoose.model('Policy', cmsPolicySchema);

const cmsData = [
  {
    policyKey: 'terms',
    title: 'Terms & Conditions',
    content: `
      <div style="line-height: 1.8; color: #374151; font-size: 14px;">
        <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">M J DIGITAL — Terms of Service</h3>
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 16px;"><strong>Effective Date:</strong> September 18, 2026 | <strong>Jurisdiction:</strong> Ahmedabad, Gujarat</p>
        
        <p style="margin-bottom: 14px;">Welcome to <strong>M J DIGITAL</strong>, operating out of Danilimda, Ahmedabad, Gujarat – 380028. By accessing our platform, purchasing retail products, or booking travel itineraries, you agree to comply with and be bound by these statutory terms.</p>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">1. Commercial Scope</h4>
        <p style="margin-bottom: 14px;">We operate a multi-vertical platform providing retail e-commerce (Mobile Handsets, Electronics, Fashion Apparel, IT & Digital Services) and domestic/international travel packages.</p>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">2. Pricing, Invoicing & GST Slabs</h4>
        <p style="margin-bottom: 14px;">All prices are in INR (₹). Invoices are generated under Gujarat GST laws (State Code: 24). Statutory tax brackets applied: 5% for Travel Packages, 12% for Fashion Apparel, and 18% for Electronics, Mobiles, and IT Services.</p>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">3. Governing Law & Legal Jurisdiction</h4>
        <p style="margin-bottom: 14px;">All commercial agreements and transactions are governed under Indian laws, with exclusive legal jurisdiction in the courts of <strong>Ahmedabad, Gujarat</strong>.</p>
      </div>
    `
  },
  {
    policyKey: 'refund',
    title: 'Refund & Cancellation Policy',
    content: `
      <div style="line-height: 1.8; color: #374151; font-size: 14px;">
        <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">M J DIGITAL — Refund & Cancellation</h3>
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 16px;"><strong>Effective Date:</strong> September 18, 2026</p>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">1. E-Commerce Physical Merchandise</h4>
        <ul style="padding-left: 20px; margin-bottom: 14px; list-style-type: disc;">
          <li>Orders can be cancelled within 12 hours of placement before dispatch.</li>
          <li>Damaged or defective goods must be reported within 48 hours of delivery with photographic evidence.</li>
          <li>Unused items with original tags and packaging can be returned within 7 days.</li>
        </ul>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">2. Travel Packages & Holiday Reservations</h4>
        <ul style="padding-left: 20px; margin-bottom: 14px; list-style-type: disc;">
          <li>15+ days prior to departure: 80% refund.</li>
          <li>7 to 14 days prior to departure: 50% refund.</li>
          <li>Under 7 days: Non-refundable due to contractual hotel/transport commitments.</li>
        </ul>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">3. Refund Timelines</h4>
        <p style="margin-bottom: 14px;">Approved refunds are credited to the original payment source (UPI/Bank/Card) within <strong>5 to 7 business days</strong>.</p>
      </div>
    `
  },
  {
    policyKey: 'privacy',
    title: 'Privacy Policy',
    content: `
      <div style="line-height: 1.8; color: #374151; font-size: 14px;">
        <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">M J DIGITAL — Privacy Policy</h3>
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 16px;"><strong>Effective Date:</strong> September 18, 2026 | <strong>Compliance:</strong> IT Act & DPDPA</p>

        <p style="margin-bottom: 14px;">M J DIGITAL values your privacy and is committed to safeguarding customer personal data.</p>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">1. Information Collected</h4>
        <p style="margin-bottom: 14px;">We collect names, shipping addresses, phone numbers, and GST details exclusively for billing, invoice compliance, and courier fulfillment.</p>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">2. Payment Security</h4>
        <p style="margin-bottom: 14px;">Payments are processed via encrypted gateways. We never store debit/credit card numbers or UPI PINs on our servers.</p>

        <h4 style="font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 18px; margin-bottom: 6px;">3. Contact Desk</h4>
        <p style="margin-bottom: 14px;">For data deletion or privacy inquiries, contact <strong>support@mjdigital.in</strong> or visit our Danilimda office in Ahmedabad, Gujarat.</p>
      </div>
    `
  }
];

async function seed() {
  for (const item of cmsData) {
    await Policy.findOneAndUpdate(
      { policyKey: item.policyKey },
      item,
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log('Clean policies re-seeded successfully!');
  process.exit();
}

seed();