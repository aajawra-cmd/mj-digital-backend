const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Express ko static HTML files serve karne ke liye setup (Main page + Admin)
app.use(express.static(__dirname));
app.use('/admin', express.static(__dirname + '/admin'));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://aajawra_db_user:BNw1UUiLi0qbf03K@cluster0.bfo7fx0.mongodb.net/mj_digital?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Database Schemas
const SettingsSchema = new mongoose.Schema({
  phone: { type: String, default: '+91 830 666 9999' },
  email: { type: String, default: 'mjdigitalworlds@gmail.com' },
  address: { type: String, default: 'GF5, Imran Residency, Near Silver Duplex, Chhipa Society, Danilimda, Ahmedabad, Gujarat – 380028, India' }
});

const CMSSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: String,
  content: String
});

const ProductSchema = new mongoose.Schema({
  title: String,
  price: Number,
  category: String,
  image: String,
  status: { type: String, default: 'Active' }
});

// Database Models
const Settings = mongoose.model('Settings', SettingsSchema);
const CMS = mongoose.model('CMS', CMSSchema);
const Product = mongoose.model('Product', ProductSchema);

// REST APIs
app.get('/api/settings', async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  } else if (settings.phone !== '+91 830 666 9999') {
    // Correct updated phone number save karein
    settings.phone = '+91 830 666 9999';
    await settings.save();
  }
  res.json(settings);
});

app.post('/api/settings', async (req, res) => {
  let settings = await Settings.findOne();
  if (settings) {
    settings = await Settings.findByIdAndUpdate(settings._id, req.body, { new: true });
  } else {
    settings = await Settings.create(req.body);
  }
  res.json({ message: 'Settings Updated Successfully', settings });
});

app.get('/api/cms/:slug', async (req, res) => {
  const policy = await CMS.findOne({ slug: req.params.slug });
  res.json(policy || { title: 'Not Found', content: '' });
});

app.post('/api/cms/:slug', async (req, res) => {
  const policy = await CMS.findOneAndUpdate(
    { slug: req.params.slug },
    { title: req.body.title, content: req.body.content },
    { upsert: true, new: true }
  );
  res.json({ message: 'Policy Updated Successfully', policy });
});

app.get('/api/products', async (req, res) => {
  const products = await Product.find({ status: 'Active' });
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const newProduct = await Product.create(req.body);
  res.json({ message: 'Product Created', product: newProduct });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running live on http://localhost:${PORT}`);
});