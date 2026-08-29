-- ==============================================================================
-- WANDERLY ENTERPRISE TRAVEL PLATFORM · POSTGRESQL DATABASE SCRIPT
-- ==============================================================================
-- Run this script in pgAdmin 4 (Query Tool) or via psql command line:
-- psql -U postgres -h localhost -p 6381 -f database.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABLE DEFINITIONS (DDL)
-- ==============================================================================

-- 1. Users Table (Travellers & Enterprise Administrators)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) DEFAULT 'user', -- 'user', 'admin', 'partner'
    phone VARCHAR(50),
    loyalty_points INTEGER DEFAULT 250,
    tier VARCHAR(30) DEFAULT 'Silver', -- 'Bronze', 'Silver', 'Gold', 'Platinum'
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Destinations Catalog Table (with UV Index & Holiday Packages)
CREATE TABLE IF NOT EXISTS destinations (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(150) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    tagline VARCHAR(255) NOT NULL,
    category TEXT[] NOT NULL,
    budget NUMERIC(10,2) NOT NULL,
    rating NUMERIC(3,2) NOT NULL DEFAULT 4.5,
    days INTEGER NOT NULL DEFAULT 3,
    image TEXT NOT NULL,
    gallery JSONB DEFAULT '[]'::jsonb,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    highlights TEXT[] NOT NULL,
    description TEXT NOT NULL,
    best_season VARCHAR(100) DEFAULT 'Oct - Mar',
    temperature VARCHAR(50) DEFAULT '24°C - 30°C',
    uv_index VARCHAR(50) DEFAULT '5 (Moderate)',
    humidity VARCHAR(50) DEFAULT '65%',
    air_quality VARCHAR(50) DEFAULT 'AQI 42 (Good)',
    package_price_silver NUMERIC(10,2) DEFAULT 6500,
    package_price_gold NUMERIC(10,2) DEFAULT 11500,
    package_price_platinum NUMERIC(10,2) DEFAULT 19500,
    is_featured BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Hotels & Luxury Resorts Table
CREATE TABLE IF NOT EXISTS hotels (
    id VARCHAR(30) PRIMARY KEY,
    destination_slug VARCHAR(100),
    name VARCHAR(150) NOT NULL,
    place VARCHAR(150) NOT NULL,
    address TEXT,
    price_per_night NUMERIC(10,2) NOT NULL,
    rating NUMERIC(3,2) NOT NULL DEFAULT 4.5,
    reviews_count INTEGER DEFAULT 120,
    image TEXT NOT NULL,
    gallery JSONB DEFAULT '[]'::jsonb,
    features TEXT[] NOT NULL,
    room_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_featured BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Flights & Scheduled Routes Table
CREATE TABLE IF NOT EXISTS flights (
    id VARCHAR(30) PRIMARY KEY,
    airline VARCHAR(100) NOT NULL,
    flight_no VARCHAR(20) NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time VARCHAR(20) NOT NULL,
    arrival_time VARCHAR(20) NOT NULL,
    duration VARCHAR(30) NOT NULL,
    stops VARCHAR(30) DEFAULT 'Non-stop',
    cabin_class VARCHAR(50) DEFAULT 'Economy',
    price NUMERIC(10,2) NOT NULL,
    seats_available INTEGER DEFAULT 45,
    baggage_allowance VARCHAR(50) DEFAULT '15 kg Check-in, 7 kg Cabin',
    logo TEXT
);

-- 5. Tours & Outdoor Adventures Table
CREATE TABLE IF NOT EXISTS tours (
    id VARCHAR(30) PRIMARY KEY,
    destination VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    rating NUMERIC(3,2) DEFAULT 4.8,
    category VARCHAR(50) NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    highlights TEXT[] NOT NULL,
    included TEXT[] NOT NULL,
    max_group_size INTEGER DEFAULT 12
);

-- 6. Unified Bookings Table (Resorts, Flights, Tours, Packages)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_ref VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_type VARCHAR(30) NOT NULL DEFAULT 'hotel', -- 'hotel', 'flight', 'tour', 'package'
    item_id VARCHAR(50),
    item_name VARCHAR(200),
    place VARCHAR(150) NOT NULL,
    check_in DATE,
    check_out DATE,
    guests INTEGER DEFAULT 1,
    rooms INTEGER DEFAULT 1,
    room_type VARCHAR(100) DEFAULT 'Standard Deluxe',
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    tax NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) DEFAULT 'confirmed', -- 'confirmed', 'completed', 'cancelled'
    payment_status VARCHAR(30) DEFAULT 'paid', -- 'paid', 'refunded', 'pending'
    payment_method VARCHAR(50) DEFAULT 'Credit Card (Stripe Encrypted)',
    traveler_info JSONB DEFAULT '{}'::jsonb,
    hotel_id VARCHAR(20),
    hotel_name VARCHAR(150),
    price_per_night NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Saved AI Itineraries Table (JSONB day-by-day plans)
CREATE TABLE IF NOT EXISTS saved_itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    destination VARCHAR(150) NOT NULL,
    days INTEGER NOT NULL,
    travel_style VARCHAR(50) DEFAULT 'Balanced',
    budget_tier VARCHAR(50) DEFAULT 'Moderate',
    total_estimated_cost NUMERIC(10,2) DEFAULT 0,
    plan JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Wishlists / Saved Favorites Table
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL, -- 'destination', 'hotel', 'tour'
    item_id VARCHAR(50) NOT NULL,
    item_title VARCHAR(200) NOT NULL,
    item_image TEXT,
    item_price NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_type, item_id)
);

-- 9. Verified Customer Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(150) NOT NULL,
    item_type VARCHAR(30) NOT NULL, -- 'destination', 'hotel', 'tour'
    item_id VARCHAR(50) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Promotional Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    code VARCHAR(50) PRIMARY KEY,
    discount_percent INTEGER NOT NULL,
    max_discount NUMERIC(10,2) NOT NULL,
    min_spend NUMERIC(10,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at DATE DEFAULT '2027-12-31'
);

-- 11. Customer Support & Helpdesk Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_ref VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(150) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(30) DEFAULT 'Normal',
    status VARCHAR(30) DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved'
    message TEXT NOT NULL,
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_itineraries_user ON saved_itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);

-- ==============================================================================
-- 3. SEED DATA (DML)
-- ==============================================================================

-- 1. Insert Pre-configured Users
INSERT INTO users (id, full_name, email, password_hash, role, phone, loyalty_points, tier)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Wanderly Enterprise Admin', 'admin@wanderly.com', 'scrypt:32768:8:1$1uA8yJ8a8n8$c7ff4d41e7be22cf5ba2c4d9bcba747fa8c3538c6ff99eeefce474f8fae5a7bfa4efea7f12e12e12e12e12e12e12e12e12e12e12e12e12e12e12e12e12e12e12', 'admin', '+91 9876543210', 5000, 'Platinum'),
('22222222-2222-2222-2222-222222222222', 'Jane Explorer', 'traveller@wanderly.com', 'scrypt:32768:8:1$1uA8yJ8a8n8$c7ff4d41e7be22cf5ba2c4d9bcba747fa8c3538c6ff99eeefce474f8fae5a7bfa4efea7f12e12e12e12e12e12e12e12e12e12e12e12e12e12e12e12e12e12e12', 'user', '+91 9123456789', 850, 'Gold')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Destinations (with UV Index & Package Tiers)
INSERT INTO destinations (slug, name, state, country, tagline, category, budget, rating, days, image, gallery, lat, lng, highlights, description, best_season, temperature, uv_index, humidity, air_quality, package_price_silver, package_price_gold, package_price_platinum, is_featured)
VALUES 
('pondicherry', 'Pondicherry', 'Tamil Nadu', 'India', 'French charm by the sea', ARRAY['beach', 'food', 'history', 'culture'], 5500, 4.8, 3, 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1400&q=85', '[]'::jsonb, 11.9416, 79.8083, ARRAY['Promenade Beach', 'Auroville Dome', 'French White Town', 'Goubert Market', 'Chic Seaside Cafes'], 'A vibrant coastal sanctuary where French colonial architecture, serene beaches, golden sunsets, and artisanal bakeries meet spiritual retreats.', 'Oct - Mar', '24°C - 30°C', '6 (High - Sunglasses & SPF 30+ recommended)', '72% (Coastal Breeze)', 'AQI 32 (Clean & Pure Marine)', 6500, 11500, 19500, true),
('munnar', 'Munnar', 'Kerala', 'India', 'Misty hills and endless emerald tea estates', ARRAY['nature', 'adventure', 'wellness'], 7500, 4.9, 3, 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=85', '[]'::jsonb, 10.0889, 77.0595, ARRAY['Kolukkumalai Sunrise', 'Eravikulam National Park', 'Mattupetty Dam', 'Tea Museum & Tasting', 'Top Station Viewpoint'], 'Nestled at 1,600m above sea level in the Western Ghats, Munnar features rolling mist, lush green plantations, rare flora, and tranquil spice valleys.', 'Sep - Apr', '14°C - 22°C', '4 (Moderate - Pleasant Alpine Sunshine)', '58% (Crisp Mountain Air)', 'AQI 18 (Exceptional / Mountain Flora)', 8500, 14000, 24000, true),
('jaipur', 'Jaipur', 'Rajasthan', 'India', 'Royal palaces, majestic forts and timeless bazaars', ARRAY['history', 'food', 'culture', 'luxury'], 9500, 4.7, 3, 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=85', '[]'::jsonb, 26.9124, 75.7873, ARRAY['Amber Fort Elephant Vista', 'Hawa Mahal', 'City Palace Museum', 'Nahargarh Sunset Point', 'Johari Traditional Bazaar'], 'The Pink City of India captivates travelers with monumental sandstone palaces, vibrant textiles, handcrafted jewelry, and regal dining feasts.', 'Oct - Mar', '18°C - 28°C', '7 (Very High - Sun Hat & Hydration)', '38% (Dry & Warm)', 'AQI 75 (Moderate Urban)', 10500, 17500, 31000, true),
('goa', 'Goa', 'Goa', 'India', 'Sun-kissed beaches, heritage churches and vibrant nightlife', ARRAY['beach', 'food', 'adventure', 'nightlife'], 8500, 4.8, 4, 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=85', '[]'::jsonb, 15.4909, 73.8278, ARRAY['Baga & Palolem Beaches', 'Fort Aguada', 'Old Goa Latin Quarter', 'Dudhsagar Waterfalls', 'Catamaran Sunset Cruises'], 'India premier coastal haven boasting palm-fringed coastlines, Portuguese baroque villas, world-class seafood shacks, and exhilarating water sports.', 'Nov - Apr', '25°C - 32°C', '8 (Very High - Apply SPF 50+)', '76% (Tropical Humid)', 'AQI 28 (Excellent Sea Breeze)', 9800, 16200, 27500, true),
('ooty', 'Ooty', 'Tamil Nadu', 'India', 'Queen of Nilgiris with alpine lakes and pine forests', ARRAY['nature', 'food', 'wellness'], 6000, 4.6, 2, 'https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=1400&q=85', '[]'::jsonb, 11.4064, 76.6932, ARRAY['Nilgiri Toy Train (UNESCO)', 'Ooty Lake Boating', 'Botanical & Rose Gardens', 'Doddabetta Peak', 'Pine Forest Walk'], 'A timeless British-era hill haven draped in aromatic eucalyptus forests, sprawling botanical collections, homemade artisan chocolates, and cool mountain breezes.', 'All Year', '12°C - 20°C', '3 (Low to Moderate - Cool Alpine)', '62% (Cool & Refreshing)', 'AQI 22 (Pristine Forest)', 7200, 12000, 19800, true),
('rishikesh', 'Rishikesh', 'Uttarakhand', 'India', 'Yoga capital of the world and alpine whitewater adventure', ARRAY['adventure', 'nature', 'wellness', 'spiritual'], 7800, 4.9, 3, 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=85', '[]'::jsonb, 30.0869, 78.2676, ARRAY['Ganga Whitewater Rafting Grade IV', 'Triveni Ghat Evening Aarti', 'Beatles Ashram', 'Cliff Jumping & Bungee', 'Riverside Yoga Camp'], 'Set where the holy Ganges river cascades into the Himalayas, offering thrilling adventure, riverside meditation camps, and spiritual serenity.', 'Sep - Jun', '16°C - 29°C', '5 (Moderate - Riverside Sun)', '48% (Comfortable)', 'AQI 26 (Fresh Himalayan Valley)', 8900, 14500, 23500, true),
('kashmir', 'Srinagar & Gulmarg', 'Kashmir', 'India', 'Paradise on Earth with shikaras and snow peaks', ARRAY['nature', 'adventure', 'luxury', 'romantic'], 12500, 4.9, 4, 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1400&q=85', '[]'::jsonb, 34.0837, 74.7973, ARRAY['Dal Lake Shikara & Houseboats', 'Gulmarg Gondola World Highest Ski', 'Pahalgam Valley of Shepherds', 'Mughal Gardens', 'Saffron Trails'], 'A breathtaking jewel surrounded by majestic snow-capped peaks, historic cedar houseboats, floating flower markets, and high-altitude meadows.', 'Apr - Oct & Dec - Feb', '4°C - 18°C', '3 (Low - Cold Alpine)', '50% (Snow/Crisp Air)', 'AQI 15 (Pure Glacier Air)', 14500, 24000, 39500, true),
('varanasi', 'Varanasi', 'Uttar Pradesh', 'India', 'The world oldest living cultural capital on the Ganges', ARRAY['spiritual', 'history', 'culture', 'food'], 6500, 4.7, 3, 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1400&q=85', '[]'::jsonb, 25.3176, 82.9739, ARRAY['Dashashwamedh Ghat Maha Aarti', 'Sunrise Boat Ride on Ganges', 'Kashi Vishwanath Temple Corridor', 'Sarnath Buddhist Stupa', 'Banarasi Silk & Street Food'], 'An ancient, soulful cradle of civilization where mystical rituals, river steps, sitar melodies, and classical culture create an unforgettable journey.', 'Oct - Mar', '17°C - 27°C', '5 (Moderate - Sacred Ghats)', '55% (River Plains)', 'AQI 68 (Moderate)', 7800, 13200, 21500, true)
ON CONFLICT (slug) DO NOTHING;

-- 3. Insert Luxury Resorts & Stays
INSERT INTO hotels (id, destination_slug, name, place, address, price_per_night, rating, reviews_count, image, gallery, features, room_types, is_featured)
VALUES 
('H001', 'pondicherry', 'Le Pondy Beach Resort & Spa', 'Pondicherry', 'No. 354, Chunnambar River Bridge, Cuddalore Main Road', 3800, 4.7, 240, 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1000&q=80', '[]'::jsonb, ARRAY['Private Beach Access', 'Infinity Ocean Pool', 'Ayurvedic Spa', 'Gourmet Breakfast', 'Free High-Speed Wi-Fi', 'Lakeside Bar'], '[{"type": "Classic Lake View Deluxe", "price_multiplier": 1.0, "max_guests": 2, "perks": "King Bed, Lake View, Breakfast"}, {"type": "Luxury Sea View Suite", "price_multiplier": 1.4, "max_guests": 3, "perks": "Private Balcony, Ocean Facing, Jacuzzi"}, {"type": "Presidential Ocean Villa", "price_multiplier": 2.2, "max_guests": 4, "perks": "Private Plunge Pool, Butler, Airport Transfer"}]'::jsonb, true),
('H002', 'munnar', 'Tea County Hilltop Sanctuary', 'Munnar', 'Tea County Road, High Range, Idukki District', 3200, 4.8, 185, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80', '[]'::jsonb, ARRAY['Panoramic Tea Estate View', 'Fireplace Lounge', 'Spice Garden Tour', 'Buffet Breakfast', 'Mountain Biking', 'Doctor on Call'], '[{"type": "Deluxe Mountain Vista", "price_multiplier": 1.0, "max_guests": 2, "perks": "Valley Facing, Tea Kit, Hot Shower"}, {"type": "Executive Tea Plantation Suite", "price_multiplier": 1.35, "max_guests": 3, "perks": "Fireplace, Wrap Balcony, Tea Tasting"}]'::jsonb, true),
('H003', 'jaipur', 'Umaid Bhawan Royal Heritage Palace', 'Jaipur', 'Behari Marg, Bani Park, Jaipur', 3500, 4.8, 310, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80', '[]'::jsonb, ARRAY['Rooftop Pool & Courtyard', 'Live Folk Dance & Music', 'Royal Rajputana Dining', 'Valet Parking', 'Heritage Architecture'], '[{"type": "Heritage Royal Room", "price_multiplier": 1.0, "max_guests": 2, "perks": "Antique Decor, Marble Bath, Breakfast"}, {"type": "Maharani Courtyard Suite", "price_multiplier": 1.5, "max_guests": 3, "perks": "Private Terrace, Peacock View, High Tea"}]'::jsonb, true),
('H004', 'goa', 'Taj Exotica Mediterranean Resort', 'Goa', 'Calwaddo, Benaulim, Salcete, South Goa', 5800, 4.9, 420, 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1000&q=80', '[]'::jsonb, ARRAY['56-acre Tropical Parkland', 'Private Beachfront Cabanas', 'Jiva Spa & Wellness', 'Kids Activity Zone', '4 Fine Dining Restaurants'], '[{"type": "Garden Villa Room", "price_multiplier": 1.0, "max_guests": 2, "perks": "Lush Lawn View, Sunset Patio, Breakfast"}, {"type": "Sunset Oceanfront Suite", "price_multiplier": 1.6, "max_guests": 3, "perks": "Arabian Sea View, Jacuzzi, Beach Butler"}]'::jsonb, true),
('H005', 'rishikesh', 'Ananda Mountain View River Lodge', 'Rishikesh', 'Tapovan, Badrinath Road, Rishikesh', 2900, 4.8, 160, 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80', '[]'::jsonb, ARRAY['River Ganga Panorama', 'Daily Sunrise Yoga Deck', 'Organic Cafe & Sattvic Meals', 'Campfire & Music', 'Kayak Rentals'], '[{"type": "Riverside Cozy Cottage", "price_multiplier": 1.0, "max_guests": 2, "perks": "River Sound, Balcony, Yoga Mat"}, {"type": "Penthouse Riverfront Suite", "price_multiplier": 1.45, "max_guests": 4, "perks": "360 Himalayan View, Rooftop Access"}]'::jsonb, true),
('H006', 'kashmir', 'The Khyber Himalayan Resort & Spa', 'Kashmir', 'Near Gondola, Gulmarg', 8900, 4.9, 290, 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1000&q=80', '[]'::jsonb, ARRAY['Heated Indoor Glass Pool', 'Ski-in / Ski-out Access', 'L Occitane Luxury Spa', 'Gourmet Kashmiri Wazwan', 'Pine Valley Deck'], '[{"type": "Premier Snow Peak Room", "price_multiplier": 1.0, "max_guests": 2, "perks": "Central Heating, Pine View, Buffet"}, {"type": "Luxury Royal Kashmiri Cottage", "price_multiplier": 1.8, "max_guests": 4, "perks": "Stone Fireplace, Jacuzzi, Private Butler"}]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Flights
INSERT INTO flights (id, airline, flight_no, origin, destination, departure_time, arrival_time, duration, stops, cabin_class, price, seats_available, baggage_allowance, logo)
VALUES 
('FL001', 'Air India', 'AI-504', 'Delhi (DEL)', 'Pondicherry (PNY)', '06:30 AM', '09:45 AM', '3h 15m', 'Non-stop', 'Economy', 4800, 32, '15 kg Check-in', '✈️'),
('FL002', 'IndiGo', '6E-284', 'Mumbai (BOM)', 'Goa (GOI)', '08:15 AM', '09:30 AM', '1h 15m', 'Non-stop', 'Economy', 3400, 48, '15 kg Check-in', '✈️'),
('FL003', 'Vistara', 'UK-872', 'Bangalore (BLR)', 'Jaipur (JAI)', '10:00 AM', '12:35 PM', '2h 35m', 'Non-stop', 'Premium Economy', 6200, 18, '20 kg Check-in', '✈️'),
('FL004', 'SpiceJet', 'SG-412', 'Chennai (MAA)', 'Kochi / Munnar (COK)', '07:00 AM', '08:20 AM', '1h 20m', 'Non-stop', 'Economy', 2950, 40, '15 kg Check-in', '✈️'),
('FL005', 'Air India Express', 'IX-601', 'Delhi (DEL)', 'Srinagar (SXR)', '09:10 AM', '10:45 AM', '1h 35m', 'Non-stop', 'Economy', 5600, 24, '15 kg Check-in', '✈️'),
('FL006', 'IndiGo', '6E-918', 'Mumbai (BOM)', 'Dehradun / Rishikesh (DED)', '11:30 AM', '01:45 PM', '2h 15m', 'Non-stop', 'Economy', 4200, 30, '15 kg Check-in', '✈️')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Tours & Experiences
INSERT INTO tours (id, destination, title, duration, price, rating, category, image, description, highlights, included, max_group_size)
VALUES 
('TR001', 'Pondicherry', 'Heritage French Quarter & Auroville Matrimandir Walking Tour', '4 Hours', 1200, 4.9, 'Culture & Walking', 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80', 'Explore French colonial villas, hidden murals, and spiritual gardens with a certified heritage curator.', ARRAY['Certified Guide', 'Auroville Entry', 'Artisan Pastry & Coffee'], ARRAY['Guide', 'Snacks', 'Transport in Auroville'], 10),
('TR002', 'Munnar', 'Kolukkumalai 4x4 Jeep Safari & World Highest Tea Plantation Sunrise', '6 Hours', 2400, 4.9, 'Adventure & Nature', 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80', 'Thrill over rugged mountain cliffs at 7,900 ft to watch the cloud carpet sunrise over Nilgiri peaks.', ARRAY['4x4 Mountain Jeep', 'Fresh Tea Factory Tour', 'Breakfast at Sunrise Deck'], ARRAY['Jeep Ride', 'Breakfast', 'Tea Tasting'], 6),
('TR003', 'Goa', 'Grand Island Scuba Diving & Dolphin Sightseeing Cruise', '7 Hours', 3100, 4.8, 'Water Sports', 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80', 'Discover exotic Arabian Sea coral reefs with PADI certified dive masters, underwater photography, and BBQ lunch.', ARRAY['PADI Master Dive', 'GoPro Underwater Video', 'Buffet Island Lunch'], ARRAY['Dive Gear', 'Photos & Videos', 'Lunch & Beer'], 12),
('TR004', 'Rishikesh', 'Ganges Grade IV River Rafting & Cliff Jumping Expedition', '5 Hours', 1800, 5.0, 'Extreme Adventure', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80', 'Navigate famous rapids including The Wall, Roller Coaster, and Three Blind Mice with expert safety kayakers.', ARRAY['16 km Rafting Stretch', 'Safety Gear & Kayak Escort', 'Riverside Tea & Maggi'], ARRAY['Helmets & Lifejackets', 'Safety Guides', 'GoPro Clips'], 8),
('TR005', 'Jaipur', 'Royal Forts & Secret Palace Cellars Heritage Night Walk', '3.5 Hours', 1500, 4.7, 'Heritage & Night', 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80', 'Experience illuminated Amber Fort and Nahargarh with royal storytellers and traditional Rajasthani sweets.', ARRAY['Nahargarh Sunset Pass', 'Heritage Storyteller', 'Traditional Sweets Tasting'], ARRAY['Entry Tickets', 'Refreshments'], 15)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Promotional Coupons
INSERT INTO coupons (code, discount_percent, max_discount, min_spend, description, is_active)
VALUES 
('WELCOME10', 10, 1500, 3000, '10% Instant Discount on your first booking', true),
('WANDER2026', 15, 2500, 5000, '15% Special Wanderly Enterprise Season Discount', true),
('LUXURY500', 20, 5000, 10000, 'Flat 20% Off on 5-Star Luxury Resorts & Packages', true),
('CORPORATE', 12, 3000, 4000, 'Enterprise Corporate Employee Travel Discount', true)
ON CONFLICT (code) DO NOTHING;
