require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');

const dbUri = (process.env.MONGO_URI || 'mongodb+srv://aajawra_db_user:MjDigital2026RahiS@cluster0.bfo7fx0.mongodb.net/mj_digital?retryWrites=true&w=majority&appName=Cluster0').trim();

const sampleCategories = [
  { name: 'Mobiles', type: 'ecommerce', slug: 'mobiles', status: 'Active' },
  { name: 'Electronics', type: 'ecommerce', slug: 'electronics', status: 'Active' },
  { name: 'Fashion', type: 'ecommerce', slug: 'fashion', status: 'Active' },
  { name: 'Services', type: 'ecommerce', slug: 'services', status: 'Active' }
];

const sampleProducts = [
  {
    title: 'iPhone 15 Pro Max',
    brand: 'Apple',
    category: 'Mobiles',
    price: 159900,
    discountPrice: 148900,
    stock: 25,
    status: 'Active',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    description: 'A17 Pro chip, Titanium design, 48MP main camera.'
  },
  {
    title: 'Samsung Galaxy S24 Ultra',
    brand: 'Samsung',
    category: 'Mobiles',
    price: 134999,
    discountPrice: 129999,
    stock: 18,
    status: 'Active',
    imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80',
    description: 'Galaxy AI is here, Titanium frame, 200MP camera.'
  },
  {
    title: 'MacBook Air M3',
    brand: 'Apple',
    category: 'Electronics',
    price: 114900,
    discountPrice: 104900,
    stock: 12,
    status: 'Active',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
    description: 'Supercharged by Apple M3 chip with 8-core CPU.'
  },
  {
    title: 'Sony WH-1000XM5 Wireless Headphones',
    brand: 'Sony',
    category: 'Electronics',
    price: 29990,
    discountPrice: 26990,
    stock: 30,
    status: 'Active',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    description: 'Industry leading noise cancellation with two processors.'
  },
  {
    title: 'Casual Slim Fit Cotton T-Shirt',
    brand: 'MJ Fashion',
    category: 'Fashion',
    price: 1499,
    discountPrice: 999,
    stock: 50,
    status: 'Active',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    description: 'Premium combed cotton breathable t-shirt.'
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB Atlas for seeding');

    // 1. Seed Categories
    if (Category) {
      await Category.deleteMany({});
      await Category.insertMany(sampleCategories);
      console.log('📁 Categories seeded successfully!');
    }

    // 2. Seed Products
    if (Product) {
      await Product.deleteMany({});
      await Product.insertMany(sampleProducts);
      console.log('📦 Products seeded successfully!');
    }

    console.log('🎉 Database Seeding Complete! Saara catalog Atlas par upload ho gaya.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();