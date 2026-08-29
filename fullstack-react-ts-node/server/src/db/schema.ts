import { pool } from '../config/db.js';

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(30),
        role VARCHAR(20) DEFAULT 'traveller',
        avatar_url VARCHAR(500),
        tier VARCHAR(30) DEFAULT 'Silver',
        loyalty_points INT DEFAULT 250,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS destinations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) DEFAULT 'India',
        slug VARCHAR(100) UNIQUE NOT NULL,
        tagline VARCHAR(255),
        description TEXT,
        image VARCHAR(500),
        rating NUMERIC(3,1) DEFAULT 4.8,
        budget INT NOT NULL,
        days INT NOT NULL,
        interest_tags TEXT[] DEFAULT '{}',
        highlights TEXT[] DEFAULT '{}',
        lat NUMERIC(9,6),
        lng NUMERIC(9,6),
        best_season VARCHAR(100),
        temperature VARCHAR(50),
        air_quality VARCHAR(100),
        humidity VARCHAR(50),
        uv_index VARCHAR(100),
        package_price_silver INT DEFAULT 6500,
        package_price_gold INT DEFAULT 11500,
        package_price_platinum INT DEFAULT 19500
      );

      CREATE TABLE IF NOT EXISTS attractions (
        id SERIAL PRIMARY KEY,
        destination_slug VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(80) NOT NULL,
        rating NUMERIC(3,1) DEFAULT 4.8,
        reviews_count INT DEFAULT 1500,
        entry_fee INT DEFAULT 0,
        duration VARCHAR(50) DEFAULT '2-3 hours',
        best_time VARCHAR(100) DEFAULT 'Morning (08:00 - 11:00)',
        description TEXT,
        image VARCHAR(500),
        gallery TEXT[] DEFAULT '{}',
        lat NUMERIC(9,6),
        lng NUMERIC(9,6),
        highlights TEXT[] DEFAULT '{}',
        insider_tip TEXT,
        address VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS restaurants (
        id SERIAL PRIMARY KEY,
        destination_slug VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        cuisine VARCHAR(100) NOT NULL,
        price_tier VARCHAR(10) DEFAULT '₹₹',
        avg_cost_for_two INT DEFAULT 1200,
        rating NUMERIC(3,1) DEFAULT 4.7,
        reviews_count INT DEFAULT 850,
        address VARCHAR(255),
        image VARCHAR(500),
        signature_dishes TEXT[] DEFAULT '{}',
        dietary_options TEXT[] DEFAULT '{}',
        description TEXT,
        lat NUMERIC(9,6),
        lng NUMERIC(9,6),
        opening_hours VARCHAR(100) DEFAULT '11:00 AM - 11:00 PM',
        phone VARCHAR(30),
        is_featured BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS hotels (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        place VARCHAR(100) NOT NULL,
        rating NUMERIC(3,1) DEFAULT 4.8,
        reviews_count INT DEFAULT 1200,
        price_per_night INT NOT NULL,
        image VARCHAR(500),
        features TEXT[] DEFAULT '{}',
        address VARCHAR(255),
        lat NUMERIC(9,6),
        lng NUMERIC(9,6)
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        booking_ref VARCHAR(50) UNIQUE NOT NULL,
        booking_type VARCHAR(30) NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        place VARCHAR(100) NOT NULL,
        check_in VARCHAR(50),
        check_out VARCHAR(50),
        guests INT DEFAULT 2,
        rooms INT DEFAULT 1,
        room_type VARCHAR(100) DEFAULT 'Standard Deluxe',
        total_amount NUMERIC(10,2) NOT NULL,
        status VARCHAR(30) DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS itineraries (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        destination VARCHAR(100) NOT NULL,
        days INT NOT NULL,
        travel_style VARCHAR(50) NOT NULL,
        budget_tier VARCHAR(50) NOT NULL,
        total_estimated_cost NUMERIC(10,2) NOT NULL,
        plan_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_percent INT NOT NULL,
        min_spend NUMERIC(10,2) DEFAULT 0,
        description VARCHAR(200)
      );
    `);
    console.log('[DB] PostgreSQL schema verified');
  } finally {
    client.release();
  }
}
