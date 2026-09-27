require('dotenv').config();
const mongoose = require('mongoose');
const TravelPackage = require('./models/TravelPackage');

const dbUri = (process.env.MONGO_URI || 'mongodb+srv://aajawra_db_user:MjDigital2026RahiS@cluster0.bfo7fx0.mongodb.net/mj_digital?retryWrites=true&w=majority&appName=Cluster0').trim();

const samplePackages = [
  {
    title: 'Kashmir Paradise Tour',
    destination: 'Srinagar & Gulmarg',
    duration: { days: 6, nights: 5 },
    price: 34999,
    pricingTiers: {
      standard: { price: 34999, description: 'Standard Hotel & Transfers' },
      deluxe: { price: 44999, description: '4-Star Resort + Shikara Ride' },
      luxury: { price: 58999, description: '5-Star Luxury Houseboat & Private Cab' }
    },
    inclusions: ['Hotels', 'Breakfast & Dinner', 'Houseboat Stay', 'Cab Transfers'],
    status: 'Active',
    images: ['https://images.unsplash.com/photo-1595846519845-68e298c2edd8?w=800']
  },
  {
    title: 'Exotic Bali Island Getaway',
    destination: 'Bali, Indonesia',
    duration: { days: 7, nights: 6 },
    price: 52999,
    pricingTiers: {
      standard: { price: 52999, description: '3-Star Hotel Stay' },
      deluxe: { price: 68999, description: 'Private Pool Villa' },
      luxury: { price: 89999, description: '5-Star Beachfront Luxury Resort' }
    },
    inclusions: ['Private Pool Villa', 'Airport Pick & Drop', 'Nusa Penida Day Tour', 'Spa'],
    status: 'Active',
    images: ['https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800']
  }
];

async function runSeed() {
  try {
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB Atlas');
    await TravelPackage.deleteMany({});
    await TravelPackage.insertMany(samplePackages);
    console.log('🎉 Travel Packages seeded successfully in Atlas!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

runSeed();