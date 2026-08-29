import os, uuid, json
import psycopg
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:6381/wanderly")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=15, kwargs={"row_factory": dict_row}, open=False)

def get_db():
    try:
        if pool.closed:
            pool.open(wait=False)
    except Exception:
        pass
    return pool.connection()

def init_db():
    try:
        if pool.closed:
            pool.open(wait=True)
        with pool.connection() as conn:
            with conn.cursor() as cur:
                # 1. Users Table
                cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                full_name VARCHAR(150) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(30) DEFAULT 'user',
                phone VARCHAR(50),
                loyalty_points INTEGER DEFAULT 250,
                tier VARCHAR(30) DEFAULT 'Silver',
                avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'user';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 250;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(30) DEFAULT 'Silver';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
            """)

            # Migrate Bookings Table columns
            cur.execute("""
            ALTER TABLE bookings ALTER COLUMN hotel_id DROP NOT NULL;
            ALTER TABLE bookings ALTER COLUMN hotel_name DROP NOT NULL;
            ALTER TABLE bookings ALTER COLUMN price_per_night DROP NOT NULL;
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_ref VARCHAR(30);
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(30) DEFAULT 'hotel';
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS item_id VARCHAR(50);
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS item_name VARCHAR(200);
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_type VARCHAR(100) DEFAULT 'Standard Deluxe';
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0;
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0;
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0;
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'paid';
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Credit Card (Stripe Encrypted)';
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS traveler_info JSONB DEFAULT '{}'::jsonb;
            """)

            # Migrate Saved Itineraries Table columns
            cur.execute("""
            ALTER TABLE saved_itineraries ADD COLUMN IF NOT EXISTS title VARCHAR(200);
            ALTER TABLE saved_itineraries ADD COLUMN IF NOT EXISTS travel_style VARCHAR(50) DEFAULT 'Balanced';
            ALTER TABLE saved_itineraries ADD COLUMN IF NOT EXISTS budget_tier VARCHAR(50) DEFAULT 'Moderate';
            ALTER TABLE saved_itineraries ADD COLUMN IF NOT EXISTS total_estimated_cost NUMERIC(10,2) DEFAULT 0;
            """)

            # 2. Destinations Table
            cur.execute("""
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
                package_price_silver NUMERIC(10,2) DEFAULT 7500,
                package_price_gold NUMERIC(10,2) DEFAULT 12500,
                package_price_platinum NUMERIC(10,2) DEFAULT 22000,
                is_featured BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE destinations ADD COLUMN IF NOT EXISTS uv_index VARCHAR(50) DEFAULT '5 (Moderate)';
            ALTER TABLE destinations ADD COLUMN IF NOT EXISTS humidity VARCHAR(50) DEFAULT '65%';
            ALTER TABLE destinations ADD COLUMN IF NOT EXISTS air_quality VARCHAR(50) DEFAULT 'AQI 42 (Good)';
            ALTER TABLE destinations ADD COLUMN IF NOT EXISTS package_price_silver NUMERIC(10,2) DEFAULT 7500;
            ALTER TABLE destinations ADD COLUMN IF NOT EXISTS package_price_gold NUMERIC(10,2) DEFAULT 12500;
            ALTER TABLE destinations ADD COLUMN IF NOT EXISTS package_price_platinum NUMERIC(10,2) DEFAULT 22000;
            """)

            # 3. Hotels & Resorts Table
            cur.execute("""
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
            """)

            # 4. Flights & Transport Table
            cur.execute("""
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
            """)

            # 5. Tours & Experiences Table
            cur.execute("""
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
            """)

            # 6. Bookings Table (Unified Hotel, Flight, Tour, Package)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id UUID PRIMARY KEY,
                booking_ref VARCHAR(30) UNIQUE NOT NULL,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                booking_type VARCHAR(30) NOT NULL DEFAULT 'hotel', -- 'hotel', 'flight', 'tour'
                item_id VARCHAR(50) NOT NULL,
                item_name VARCHAR(200) NOT NULL,
                place VARCHAR(150) NOT NULL,
                check_in DATE,
                check_out DATE,
                guests INTEGER DEFAULT 1,
                rooms INTEGER DEFAULT 1,
                room_type VARCHAR(100) DEFAULT 'Standard Deluxe',
                subtotal NUMERIC(10,2) NOT NULL,
                discount NUMERIC(10,2) DEFAULT 0,
                tax NUMERIC(10,2) NOT NULL,
                total_amount NUMERIC(10,2) NOT NULL,
                status VARCHAR(30) DEFAULT 'confirmed', -- 'confirmed', 'completed', 'cancelled'
                payment_status VARCHAR(30) DEFAULT 'paid', -- 'paid', 'refunded', 'pending'
                payment_method VARCHAR(50) DEFAULT 'Credit Card (Stripe Encrypted)',
                traveler_info JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 7. Saved Itineraries Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS saved_itineraries (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                destination VARCHAR(150) NOT NULL,
                days INTEGER NOT NULL,
                travel_style VARCHAR(50) DEFAULT 'Balanced',
                budget_tier VARCHAR(50) DEFAULT 'Moderate',
                total_estimated_cost NUMERIC(10,2),
                plan JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 8. Wishlists / Bookmarks Table
            cur.execute("""
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
            """)

            # 9. Customer Reviews Table
            cur.execute("""
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
            """)

            # 10. Coupons & Promotions Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS coupons (
                code VARCHAR(50) PRIMARY KEY,
                discount_percent INTEGER NOT NULL,
                max_discount NUMERIC(10,2) NOT NULL,
                min_spend NUMERIC(10,2) NOT NULL,
                description VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                expires_at DATE DEFAULT '2027-12-31'
            );
            """)

            # 11. Support & Helpdesk Tickets Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS support_tickets (
                id UUID PRIMARY KEY,
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
            """)

            # 12. Nearby Attractions Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS attractions (
                id VARCHAR(30) PRIMARY KEY,
                destination_slug VARCHAR(100) NOT NULL,
                name VARCHAR(150) NOT NULL,
                category VARCHAR(50) NOT NULL,
                rating NUMERIC(3,2) NOT NULL DEFAULT 4.7,
                reviews_count INTEGER DEFAULT 150,
                entry_fee NUMERIC(10,2) DEFAULT 0,
                duration VARCHAR(50) DEFAULT '2-3 Hours',
                best_time VARCHAR(100) DEFAULT 'Early Morning / Sunset',
                description TEXT NOT NULL,
                image TEXT NOT NULL,
                gallery JSONB DEFAULT '[]'::jsonb,
                lat NUMERIC(9,6) NOT NULL,
                lng NUMERIC(9,6) NOT NULL,
                highlights TEXT[] NOT NULL,
                insider_tip TEXT,
                address TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 13. Restaurants & Culinary Guide Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS restaurants (
                id VARCHAR(30) PRIMARY KEY,
                destination_slug VARCHAR(100) NOT NULL,
                name VARCHAR(150) NOT NULL,
                cuisine VARCHAR(100) NOT NULL,
                price_tier VARCHAR(10) DEFAULT '₹₹',
                avg_cost_for_two NUMERIC(10,2) DEFAULT 1200,
                rating NUMERIC(3,2) NOT NULL DEFAULT 4.6,
                reviews_count INTEGER DEFAULT 200,
                address TEXT NOT NULL,
                image TEXT NOT NULL,
                signature_dishes TEXT[] NOT NULL,
                dietary_options TEXT[] NOT NULL,
                description TEXT NOT NULL,
                lat NUMERIC(9,6) NOT NULL,
                lng NUMERIC(9,6) NOT NULL,
                opening_hours VARCHAR(100) DEFAULT '11:00 AM - 11:00 PM',
                phone VARCHAR(50),
                is_featured BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 14. Indexes
            cur.execute("CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_itineraries_user ON saved_itineraries(user_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_type, item_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_attractions_dest ON attractions(destination_slug);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_attractions_cat ON attractions(category);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_restaurants_dest ON restaurants(destination_slug);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants(cuisine);")

            conn.commit()

        # Seed initial data
        seed_data(conn)
    except Exception as e:
        print(f"[DB WARNING] Database init status: {e}")

def seed_data(conn):
    with conn.cursor() as cur:
        # Upsert Admin and Standard User with consistent demo passwords
        admin_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        cur.execute("""
        INSERT INTO users (id, full_name, email, password_hash, role, phone, loyalty_points, tier)
        VALUES 
        (%s, 'Wanderly Enterprise Admin', 'admin@wanderly.com', %s, 'admin', '+91 9876543210', 5000, 'Platinum')
        ON CONFLICT (email) DO UPDATE 
        SET role = 'admin', password_hash = EXCLUDED.password_hash, loyalty_points = 5000, tier = 'Platinum';
        """, (admin_id, generate_password_hash("admin123")))

        cur.execute("""
        INSERT INTO users (id, full_name, email, password_hash, role, phone, loyalty_points, tier)
        VALUES 
        (%s, 'Jane Explorer', 'traveller@wanderly.com', %s, 'user', '+91 9123456789', 850, 'Gold')
        ON CONFLICT (email) DO UPDATE 
        SET password_hash = EXCLUDED.password_hash, loyalty_points = 850, tier = 'Gold';
        """, (user_id, generate_password_hash("password123")))

        # Seed destinations with UV index, AQI, weather, and package tiers
        destinations = [
            (
                "pondicherry", "Pondicherry", "Tamil Nadu", "India", "French charm by the sea",
                ["beach", "food", "history", "culture"], 5500, 4.8, 3,
                "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1400&q=85",
                Jsonb([
                    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=80",
                    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80"
                ]),
                11.9416, 79.8083,
                ["Promenade Beach", "Auroville Dome", "French White Town", "Goubert Market", "Chic Seaside Cafes"],
                "A vibrant coastal sanctuary where French colonial architecture, serene beaches, golden sunsets, and artisanal bakeries meet spiritual retreats.",
                "Oct - Mar", "24°C - 30°C", "6 (High - Sunglasses & SPF 30+ recommended)", "72% (Coastal Breeze)", "AQI 32 (Clean & Pure Marine)",
                6500, 11500, 19500, True
            ),
            (
                "munnar", "Munnar", "Kerala", "India", "Misty hills and endless emerald tea estates",
                ["nature", "adventure", "wellness"], 7500, 4.9, 3,
                "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=85",
                Jsonb([
                    "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1000&q=80"
                ]),
                10.0889, 77.0595,
                ["Kolukkumalai Sunrise", "Eravikulam National Park", "Mattupetty Dam", "Tea Museum & Tasting", "Top Station Viewpoint"],
                "Nestled at 1,600m above sea level in the Western Ghats, Munnar features rolling mist, lush green plantations, rare flora, and tranquil spice valleys.",
                "Sep - Apr", "14°C - 22°C", "4 (Moderate - Pleasant Alpine Sunshine)", "58% (Crisp Mountain Air)", "AQI 18 (Exceptional / Mountain Flora)",
                8500, 14000, 24000, True
            ),
            (
                "jaipur", "Jaipur", "Rajasthan", "India", "Royal palaces, majestic forts and timeless bazaars",
                ["history", "food", "culture", "luxury"], 9500, 4.7, 3,
                "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=85",
                Jsonb([]),
                26.9124, 75.7873,
                ["Amber Fort Elephant Vista", "Hawa Mahal", "City Palace Museum", "Nahargarh Sunset Point", "Johari Traditional Bazaar"],
                "The Pink City of India captivates travelers with monumental sandstone palaces, vibrant textiles, handcrafted jewelry, and regal dining feasts.",
                "Oct - Mar", "18°C - 28°C", "7 (Very High - Sun Hat & Hydration)", "38% (Dry & Warm)", "AQI 75 (Moderate Urban)",
                10500, 17500, 31000, True
            ),
            (
                "goa", "Goa", "Goa", "India", "Sun-kissed beaches, heritage churches and vibrant nightlife",
                ["beach", "food", "adventure", "nightlife"], 8500, 4.8, 4,
                "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=85",
                Jsonb([]),
                15.4909, 73.8278,
                ["Baga & Palolem Beaches", "Fort Aguada", "Old Goa Latin Quarter", "Dudhsagar Waterfalls", "Catamaran Sunset Cruises"],
                "India's premier coastal haven boasting palm-fringed coastlines, Portuguese baroque villas, world-class seafood shacks, and exhilarating water sports.",
                "Nov - Apr", "25°C - 32°C", "8 (Very High - Apply SPF 50+)", "76% (Tropical Humid)", "AQI 28 (Excellent Sea Breeze)",
                9800, 16200, 27500, True
            ),
            (
                "ooty", "Ooty", "Tamil Nadu", "India", "Queen of Nilgiris with alpine lakes and pine forests",
                ["nature", "food", "wellness"], 6000, 4.6, 2,
                "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=1400&q=85",
                Jsonb([]),
                11.4064, 76.6932,
                ["Nilgiri Toy Train (UNESCO)", "Ooty Lake Boating", "Botanical & Rose Gardens", "Doddabetta Peak", "Pine Forest Walk"],
                "A timeless British-era hill haven draped in aromatic eucalyptus forests, sprawling botanical collections, homemade artisan chocolates, and cool mountain breezes.",
                "All Year", "12°C - 20°C", "3 (Low to Moderate - Cool Alpine)", "62% (Cool & Refreshing)", "AQI 22 (Pristine Forest)",
                7200, 12000, 19800, True
            ),
            (
                "rishikesh", "Rishikesh", "Uttarakhand", "India", "Yoga capital of the world and alpine whitewater adventure",
                ["adventure", "nature", "wellness", "spiritual"], 7800, 4.9, 3,
                "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=85",
                Jsonb([]),
                30.0869, 78.2676,
                ["Ganga Whitewater Rafting Grade IV", "Triveni Ghat Evening Aarti", "Beatles Ashram", "Cliff Jumping & Bungee", "Riverside Yoga Camp"],
                "Set where the holy Ganges river cascades into the Himalayas, offering thrilling adventure, riverside meditation camps, and spiritual serenity.",
                "Sep - Jun", "16°C - 29°C", "5 (Moderate - Riverside Sun)", "48% (Comfortable)", "AQI 26 (Fresh Himalayan Valley)",
                8900, 14500, 23500, True
            ),
            (
                "kashmir", "Srinagar & Gulmarg", "Kashmir", "India", "Paradise on Earth with shikaras and snow peaks",
                ["nature", "adventure", "luxury", "romantic"], 12500, 4.9, 4,
                "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1400&q=85",
                Jsonb([]),
                34.0837, 74.7973,
                ["Dal Lake Shikara & Houseboats", "Gulmarg Gondola World Highest Ski", "Pahalgam Valley of Shepherds", "Mughal Gardens", "Saffron Trails"],
                "A breathtaking jewel surrounded by majestic snow-capped peaks, historic cedar houseboats, floating flower markets, and high-altitude meadows.",
                "Apr - Oct & Dec - Feb", "4°C - 18°C", "3 (Low - Cold Alpine)", "50% (Snow/Crisp Air)", "AQI 15 (Pure Glacier Air)",
                14500, 24000, 39500, True
            ),
            (
                "varanasi", "Varanasi", "Uttar Pradesh", "India", "The world's oldest living cultural capital on the Ganges",
                ["spiritual", "history", "culture", "food"], 6500, 4.7, 3,
                "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1400&q=85",
                Jsonb([]),
                25.3176, 82.9739,
                ["Dashashwamedh Ghat Maha Aarti", "Sunrise Boat Ride on Ganges", "Kashi Vishwanath Temple Corridor", "Sarnath Buddhist Stupa", "Banarasi Silk & Street Food"],
                "An ancient, soulful cradle of civilization where mystical rituals, river steps, sitar melodies, and classical culture create an unforgettable journey.",
                "Oct - Mar", "17°C - 27°C", "5 (Moderate - Sacred Ghats)", "55% (River Plains)", "AQI 68 (Moderate)",
                7800, 13200, 21500, True
            )
        ]
        for d in destinations:
            cur.execute("""
            INSERT INTO destinations (
                slug, name, state, country, tagline, category, budget, rating, days,
                image, gallery, lat, lng, highlights, description, best_season, temperature,
                uv_index, humidity, air_quality, package_price_silver, package_price_gold, package_price_platinum, is_featured
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (slug) DO UPDATE SET
                uv_index = EXCLUDED.uv_index,
                humidity = EXCLUDED.humidity,
                air_quality = EXCLUDED.air_quality,
                package_price_silver = EXCLUDED.package_price_silver,
                package_price_gold = EXCLUDED.package_price_gold,
                package_price_platinum = EXCLUDED.package_price_platinum,
                best_season = EXCLUDED.best_season,
                temperature = EXCLUDED.temperature;
            """, d)

        # Check hotels
        cur.execute("SELECT count(*) as count FROM hotels")
        hotel_count = cur.fetchone()["count"]
        if hotel_count == 0:
            hotels = [
                (
                    "H001", "pondicherry", "Le Pondy Beach Resort & Spa", "Pondicherry", "No. 354, Chunnambar River Bridge, Cuddalore Main Road",
                    3800, 4.7, 240,
                    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1000&q=80",
                    Jsonb([]),
                    ["Private Beach Access", "Infinity Ocean Pool", "Ayurvedic Spa", "Gourmet Breakfast", "Free High-Speed Wi-Fi", "Lakeside Bar"],
                    Jsonb([
                        {"type": "Classic Lake View Deluxe", "price_multiplier": 1.0, "max_guests": 2, "perks": "King Bed, Lake View, Breakfast"},
                        {"type": "Luxury Sea View Suite", "price_multiplier": 1.4, "max_guests": 3, "perks": "Private Balcony, Ocean Facing, Jacuzzi"},
                        {"type": "Presidential Ocean Villa", "price_multiplier": 2.2, "max_guests": 4, "perks": "Private Plunge Pool, Butler, Airport Transfer"}
                    ]),
                    True
                ),
                (
                    "H002", "munnar", "Tea County Hilltop Sanctuary", "Munnar", "Tea County Road, High Range, Idukki District",
                    3200, 4.8, 185,
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
                    Jsonb([]),
                    ["Panoramic Tea Estate View", "Fireplace Lounge", "Spice Garden Tour", "Buffet Breakfast", "Mountain Biking", "Doctor on Call"],
                    Jsonb([
                        {"type": "Deluxe Mountain Vista", "price_multiplier": 1.0, "max_guests": 2, "perks": "Valley Facing, Tea Kit, Hot Shower"},
                        {"type": "Executive Tea Plantation Suite", "price_multiplier": 1.35, "max_guests": 3, "perks": "Fireplace, Wrap Balcony, Tea Tasting"}
                    ]),
                    True
                ),
                (
                    "H003", "jaipur", "Umaid Bhawan Royal Heritage Palace", "Jaipur", "Behari Marg, Bani Park, Jaipur",
                    3500, 4.8, 310,
                    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80",
                    Jsonb([]),
                    ["Rooftop Pool & Courtyard", "Live Folk Dance & Music", "Royal Rajputana Dining", "Valet Parking", "Heritage Architecture"],
                    Jsonb([
                        {"type": "Heritage Royal Room", "price_multiplier": 1.0, "max_guests": 2, "perks": "Antique Decor, Marble Bath, Breakfast"},
                        {"type": "Maharani Courtyard Suite", "price_multiplier": 1.5, "max_guests": 3, "perks": "Private Terrace, Peacock View, High Tea"}
                    ]),
                    True
                ),
                (
                    "H004", "goa", "Taj Exotica Mediterranean Resort", "Goa", "Calwaddo, Benaulim, Salcete, South Goa",
                    5800, 4.9, 420,
                    "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1000&q=80",
                    Jsonb([]),
                    ["56-acre Tropical Parkland", "Private Beachfront Cabanas", "Jiva Spa & Wellness", "Kids Activity Zone", "4 Fine Dining Restaurants"],
                    Jsonb([
                        {"type": "Garden Villa Room", "price_multiplier": 1.0, "max_guests": 2, "perks": "Lush Lawn View, Sunset Patio, Breakfast"},
                        {"type": "Sunset Oceanfront Suite", "price_multiplier": 1.6, "max_guests": 3, "perks": "Arabian Sea View, Jacuzzi, Beach Butler"}
                    ]),
                    True
                ),
                (
                    "H005", "rishikesh", "Ananda Mountain View River Lodge", "Rishikesh", "Tapovan, Badrinath Road, Rishikesh",
                    2900, 4.8, 160,
                    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80",
                    Jsonb([]),
                    ["River Ganga Panorama", "Daily Sunrise Yoga Deck", "Organic Cafe & Sattvic Meals", "Campfire & Music", "Kayak Rentals"],
                    Jsonb([
                        {"type": "Riverside Cozy Cottage", "price_multiplier": 1.0, "max_guests": 2, "perks": "River Sound, Balcony, Yoga Mat"},
                        {"type": "Penthouse Riverfront Suite", "price_multiplier": 1.45, "max_guests": 4, "perks": "360 Himalayan View, Rooftop Access"}
                    ]),
                    True
                ),
                (
                    "H006", "kashmir", "The Khyber Himalayan Resort & Spa", "Kashmir", "Near Gondola, Gulmarg",
                    8900, 4.9, 290,
                    "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1000&q=80",
                    Jsonb([]),
                    ["Heated Indoor Glass Pool", "Ski-in / Ski-out Access", "L'Occitane Luxury Spa", "Gourmet Kashmiri Wazwan", "Pine Valley Deck"],
                    Jsonb([
                        {"type": "Premier Snow Peak Room", "price_multiplier": 1.0, "max_guests": 2, "perks": "Central Heating, Pine View, Buffet"},
                        {"type": "Luxury Royal Kashmiri Cottage", "price_multiplier": 1.8, "max_guests": 4, "perks": "Stone Fireplace, Jacuzzi, Private Butler"}
                    ]),
                    True
                )
            ]
            for h in hotels:
                cur.execute("""
                INSERT INTO hotels (id, destination_slug, name, place, address, price_per_night, rating, reviews_count, image, gallery, features, room_types, is_featured)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, h)

        # Check Flights
        cur.execute("SELECT count(*) as count FROM flights")
        flight_count = cur.fetchone()["count"]
        if flight_count == 0:
            flights = [
                ("FL001", "Air India", "AI-504", "Delhi (DEL)", "Pondicherry (PNY)", "06:30 AM", "09:45 AM", "3h 15m", "Non-stop", "Economy", 4800, 32, "15 kg Check-in", "✈️"),
                ("FL002", "IndiGo", "6E-284", "Mumbai (BOM)", "Goa (GOI)", "08:15 AM", "09:30 AM", "1h 15m", "Non-stop", "Economy", 3400, 48, "15 kg Check-in", "✈️"),
                ("FL003", "Vistara", "UK-872", "Bangalore (BLR)", "Jaipur (JAI)", "10:00 AM", "12:35 PM", "2h 35m", "Non-stop", "Premium Economy", 6200, 18, "20 kg Check-in", "✈️"),
                ("FL004", "SpiceJet", "SG-412", "Chennai (MAA)", "Kochi / Munnar (COK)", "07:00 AM", "08:20 AM", "1h 20m", "Non-stop", "Economy", 2950, 40, "15 kg Check-in", "✈️"),
                ("FL005", "Air India Express", "IX-601", "Delhi (DEL)", "Srinagar (SXR)", "09:10 AM", "10:45 AM", "1h 35m", "Non-stop", "Economy", 5600, 24, "15 kg Check-in", "✈️"),
                ("FL006", "IndiGo", "6E-918", "Mumbai (BOM)", "Dehradun / Rishikesh (DED)", "11:30 AM", "01:45 PM", "2h 15m", "Non-stop", "Economy", 4200, 30, "15 kg Check-in", "✈️")
            ]
            for f in flights:
                cur.execute("""
                INSERT INTO flights (id, airline, flight_no, origin, destination, departure_time, arrival_time, duration, stops, cabin_class, price, seats_available, baggage_allowance, logo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, f)

        # Check Tours & Experiences
        cur.execute("SELECT count(*) as count FROM tours")
        tour_count = cur.fetchone()["count"]
        if tour_count == 0:
            tours = [
                ("TR001", "Pondicherry", "Heritage French Quarter & Auroville Matrimandir Walking Tour", "4 Hours", 1200, 4.9, "Culture & Walking", "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80", "Explore French colonial villas, hidden murals, and spiritual gardens with a certified heritage curator.", ["Certified Guide", "Auroville Entry", "Artisan Pastry & Coffee"], ["Guide", "Snacks", "Transport in Auroville"], 10),
                ("TR002", "Munnar", "Kolukkumalai 4x4 Jeep Safari & World's Highest Tea Plantation Sunrise", "6 Hours", 2400, 4.9, "Adventure & Nature", "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80", "Thrill over rugged mountain cliffs at 7,900 ft to watch the cloud carpet sunrise over Nilgiri peaks.", ["4x4 Mountain Jeep", "Fresh Tea Factory Tour", "Breakfast at Sunrise Deck"], ["Jeep Ride", "Breakfast", "Tea Tasting"], 6),
                ("TR003", "Goa", "Grand Island Scuba Diving & Dolphin Sightseeing Cruise", "7 Hours", 3100, 4.8, "Water Sports", "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80", "Discover exotic Arabian Sea coral reefs with PADI certified dive masters, underwater photography, and BBQ lunch.", ["PADI Master Dive", "GoPro Underwater Video", "Buffet Island Lunch"], ["Dive Gear", "Photos & Videos", "Lunch & Beer"], 12),
                ("TR004", "Rishikesh", "Ganges Grade IV River Rafting & Cliff Jumping Expedition", "5 Hours", 1800, 5.0, "Extreme Adventure", "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80", "Navigate famous rapids including 'The Wall', 'Roller Coaster', and 'Three Blind Mice' with expert safety kayakers.", ["16 km Rafting Stretch", "Safety Gear & Kayak Escort", "Riverside Tea & Maggi"], ["Helmets & Lifejackets", "Safety Guides", "GoPro Clips"], 8),
                ("TR005", "Jaipur", "Royal Forts & Secret Palace Cellars Heritage Night Walk", "3.5 Hours", 1500, 4.7, "Heritage & Night", "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80", "Experience illuminated Amber Fort and Nahargarh with royal storytellers and traditional Rajasthani sweets.", ["Nahargarh Sunset Pass", "Heritage Storyteller", "Traditional Sweets Tasting"], ["Entry Tickets", "Refreshments"], 15)
            ]
            for t in tours:
                cur.execute("""
                INSERT INTO tours (id, destination, title, duration, price, rating, category, image, description, highlights, included, max_group_size)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, t)

        # Check Coupons
        cur.execute("SELECT count(*) as count FROM coupons")
        coupon_count = cur.fetchone()["count"]
        if coupon_count == 0:
            coupons = [
                ("WELCOME10", 10, 1500, 3000, "10% Instant Discount on your first booking", True),
                ("WANDER2026", 15, 2500, 5000, "15% Special Wanderly Enterprise Season Discount", True),
                ("LUXURY500", 20, 5000, 10000, "Flat 20% Off on 5-Star Luxury Resorts & Packages", True),
                ("CORPORATE", 12, 3000, 4000, "Enterprise Corporate Employee Travel Discount", True)
            ]
            for c in coupons:
                cur.execute("""
                INSERT INTO coupons (code, discount_percent, max_discount, min_spend, description, is_active)
                VALUES (%s, %s, %s, %s, %s, %s);
                """, c)

        # Check Reviews
        cur.execute("SELECT count(*) as count FROM reviews")
        review_count = cur.fetchone()["count"]
        if review_count == 0:
            reviews = [
                ("Jane Explorer", "hotel", "H001", 5, "Incredible French hospitality & ocean view!", "The private beach and infinity pool exceeded all expectations. The breakfast spread was fresh and delicious."),
                ("David Miller", "hotel", "H002", 5, "Best tea estate stay in Munnar", "Waking up to mist rolling over the tea gardens while having warm cardamom tea was magical."),
                ("Sophia Sharma", "destination", "1", 5, "Auroville & White Town were breathtaking", "Clean beaches, peaceful vibes, and phenomenal French bakeries. Highly recommended for couples and solo travelers."),
                ("Rahul Verma", "tour", "TR004", 5, "Best river rafting experience of my life", "Grade 4 rapids in Rishikesh were adrenaline pumping! The safety instructors were world class.")
            ]
            for r in reviews:
                cur.execute("""
                INSERT INTO reviews (user_id, user_name, item_type, item_id, rating, title, comment)
                SELECT id, %s, %s, %s, %s, %s, %s FROM users LIMIT 1;
                """, r)

        # Check & Seed Nearby Attractions
        cur.execute("SELECT count(*) as count FROM attractions")
        attraction_count = cur.fetchone()["count"]
        if attraction_count == 0:
            attractions = [
                # Pondicherry
                ("ATT_PDY_01", "pondicherry", "Auroville Matrimandir & Peace Gardens", "Spiritual", 4.9, 320, 0, "3-4 Hours", "09:00 AM - 04:30 PM", "A magnificent golden geodesic sphere dedicated to human unity and silent concentration, surrounded by tranquil landscaped gardens.", "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80", Jsonb([]), 12.0070, 79.8106, ["Golden Sphere", "Silent Meditation", "Organic Cafes"], "Book inner chamber passes online at least 3 days in advance.", "Auroville, Viluppuram District, Tamil Nadu"),
                ("ATT_PDY_02", "pondicherry", "French White Town Colonial Quarter", "Heritage", 4.8, 410, 0, "2-3 Hours", "Sunrise or 04:00 PM - 08:00 PM", "Pastel yellow French colonial mansions with bougainvillea vines, chic art galleries, boutique cafes, and cobbled tree-lined avenues.", "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80", Jsonb([]), 11.9340, 79.8335, ["Colonial Mansions", "Bougainvillea Streets", "Art Cafes"], "Rent a vintage bicycle to explore the narrow French streets at your own pace.", "White Town, Puducherry"),
                ("ATT_PDY_03", "pondicherry", "Promenade Beach & Gandhi Memorial", "Viewpoint", 4.7, 560, 0, "1-2 Hours", "05:30 AM - 08:30 AM / 05:00 PM - 10:00 PM", "A 1.5 km scenic seaside promenade closed to vehicular traffic in evenings, featuring sea spray, cafes, and historic monuments.", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80", Jsonb([]), 11.9328, 79.8359, ["Oceanfront Walkway", "Gandhi Statue", "Evening Sea Breeze"], "Visit at sunrise for crisp sea air and watching local fishermen.", "Goubert Avenue, Pondicherry"),
                ("ATT_PDY_04", "pondicherry", "Paradise Beach & Chunnambar Backwaters", "Nature", 4.8, 280, 150, "3-4 Hours", "09:00 AM - 05:00 PM", "An isolated golden sand beach reachable via scenic ferry ride across the Chunnambar backwaters.", "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80", Jsonb([]), 11.8845, 79.8180, ["Ferry Ride", "Golden Sand", "Water Sports"], "Take the morning boat to beat the afternoon crowds.", "Chunnambar, Cuddalore Road, Pondicherry"),

                # Munnar
                ("ATT_MNR_01", "munnar", "Kolukkumalai Sunrise & Highest Tea Estate", "Viewpoint", 5.0, 480, 300, "5-6 Hours", "04:30 AM - 10:00 AM", "The world's highest organic tea estate at 7,900 ft, renowned for jaw-dropping sea-of-clouds sunrise vistas across Tamil Nadu and Kerala borders.", "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80", Jsonb([]), 10.0844, 77.1866, ["Cloud Carpet Sunrise", "Orthodox Tea Factory", "4x4 Mountain Ride"], "Wear heavy layers as temperatures can drop below 8°C before sunrise.", "Kottagudi, near Munnar"),
                ("ATT_MNR_02", "munnar", "Eravikulam National Park (Rajamalai)", "Nature", 4.9, 620, 200, "3-4 Hours", "07:30 AM - 04:00 PM", "Sanctuary for the endangered Nilgiri Tahr mountain ibex, offering rolling high-altitude grasslands with panoramic views of Anamudi peak.", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80", Jsonb([]), 10.2000, 77.0667, ["Nilgiri Tahr Spotting", "Anamudi Peak Vista", "Neelakurinji Blooms"], "Book forest department safari buses online to avoid ticket queues.", "Kannan Devan Hills, Munnar"),
                ("ATT_MNR_03", "munnar", "Mattupetty Dam & Echo Point", "Nature", 4.6, 390, 50, "2 Hours", "09:00 AM - 05:00 PM", "Surrounded by tea plantations and eucalyptus forests, offering speedboating, natural echo phenomenon, and elephant sightings.", "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80", Jsonb([]), 10.1064, 77.1245, ["Speedboating", "Echo Phenomenon", "Elephant Corridor"], "Try fresh spiced sweet corn and pineapple slices from local lakeside stalls.", "Munnar-Top Station Hwy, Kerala"),

                # Jaipur
                ("ATT_JAI_01", "jaipur", "Amber Fort & Sheesh Mahal", "Heritage", 4.9, 890, 200, "3-4 Hours", "08:00 AM - 05:30 PM & 06:30 PM Light Show", "A massive 16th-century hilltop fortress boasting opulent marble courtyards, the mirror-encrusted Sheesh Mahal, and grand Rajput architecture.", "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80", Jsonb([]), 26.9855, 75.8513, ["Sheesh Mahal (Hall of Mirrors)", "Maota Lake View", "Royal Courtyards"], "Hire an official audio guide or take the illuminated night heritage tour.", "Devisinghpura, Amer, Jaipur"),
                ("ATT_JAI_02", "jaipur", "Hawa Mahal (Palace of Winds)", "Architecture", 4.8, 740, 50, "1-2 Hours", "09:00 AM - 05:00 PM", "A five-story pink sandstone facade with 953 honeycomb jharokha windows built to allow royal women to observe street festivals unnoticed.", "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80", Jsonb([]), 26.9239, 75.8267, ["953 Windows", "Honeycomb Architecture", "Pink Sandstone"], "Head to Wind View Cafe across the street for iconic panoramic photos.", "Hawa Mahal Rd, Badi Choupad, Jaipur"),
                ("ATT_JAI_03", "jaipur", "Nahargarh Fort Sunset Terrace", "Viewpoint", 4.8, 610, 50, "2-3 Hours", "10:00 AM - 07:00 PM", "Perched atop the Aravalli hills, offering sweeping sunset vistas overlooking the entire illuminated expanse of the Pink City.", "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80", Jsonb([]), 26.9378, 75.8156, ["Pink City Sunset Panorama", "Aravalli Ridge", "Historic Ramparts"], "Reach Nahargarh 45 minutes before sunset to grab the best vantage terrace spot.", "Krishna Nagar, Brahampuri, Jaipur"),

                # Goa
                ("ATT_GOA_01", "goa", "Dudhsagar Four-Tiered Waterfalls", "Adventure", 4.9, 520, 450, "5-6 Hours", "06:00 AM - 04:30 PM", "One of India's tallest 4-tiered waterfalls cascading 310 meters through lush Western Ghats jungles, accessible via 4x4 jungle jeep safari.", "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80", Jsonb([]), 15.3144, 74.3143, ["310m Cascade", "4x4 Jungle Safari", "Natural Swimming Pool"], "Wear lifejackets (mandatory) for a swim in the crisp freshwater pool under the falls.", "Sonaulim, Goa"),
                ("ATT_GOA_02", "goa", "Fort Aguada & 17th Century Lighthouse", "Heritage", 4.7, 680, 50, "2 Hours", "09:30 AM - 06:00 PM", "A well-preserved Portuguese fortress overlooking the vast Arabian Sea and the Mandovi river confluence.", "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80", Jsonb([]), 15.4925, 73.7736, ["Sea Fort Ramparts", "Historic Lighthouse", "Arabian Sea Panorama"], "The lower fort near Sinquerim beach offers dramatic crashing wave photos.", "Candolim, Sinquerim, Goa"),
                ("ATT_GOA_03", "goa", "Palolem Crescent Beach & Butterfly Island", "Nature", 4.8, 730, 0, "Full Day", "All Day", "A serene crescent-shaped beach lined with coconut palms, vibrant beach shacks, and boat trips to secluded Butterfly Beach.", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80", Jsonb([]), 15.0100, 74.0231, ["Crescent Bay", "Dolphin Watching", "Kayak to Butterfly Beach"], "Rent a transparent ocean kayak during low tide for dolphin spotting.", "Canacona, South Goa"),

                # Ooty
                ("ATT_OTY_01", "ooty", "Nilgiri Mountain Toy Train (UNESCO Heritage)", "Heritage", 4.9, 780, 205, "3.5 Hours", "07:10 AM / 02:00 PM", "A charming historic steam railway passing through 16 tunnels, 250 bridges, and scenic tea mountain slopes.", "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=800&q=80", Jsonb([]), 11.4060, 76.6960, ["Historic Steam Train", "Mountain Bridges", "Valley Vistas"], "Book first-class tickets in advance on IRCTC for the Coonoor to Ooty stretch.", "Ooty Railway Station, Tamil Nadu"),
                ("ATT_OTY_02", "ooty", "Doddabetta Peak & Telescope House", "Viewpoint", 4.7, 490, 40, "2 Hours", "07:00 AM - 06:00 PM", "The highest peak in the Nilgiri Mountains at 2,637m, offering 360-degree views of Chamundi Hills and Nilgiri valleys.", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80", Jsonb([]), 11.4014, 76.7358, ["Highest Nilgiri Peak", "Telescope View", "Pine Woods"], "Visit early morning before cloud mist rolls in around noon.", "Ooty-Kotagiri Road, Tamil Nadu"),

                # Rishikesh
                ("ATT_RSK_01", "rishikesh", "Ganges Whitewater Rafting & Rapid Jumping", "Adventure", 5.0, 850, 1200, "4-5 Hours", "08:00 AM - 04:00 PM", "World-renowned Grade III and IV whitewater rafting rapids like Roller Coaster, Golf Course, and The Wall on the sacred Ganges.", "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80", Jsonb([]), 30.1340, 78.3240, ["Grade IV Rapids", "Cliff Jumping Point", "Himalayan Gorge"], "Optimal season is September through June; choose the 16 km Shivpuri to NIM beach stretch.", "Shivpuri to Tapovan, Rishikesh"),
                ("ATT_RSK_02", "rishikesh", "The Beatles Ashram (Chaurasi Kutia)", "Culture", 4.8, 380, 150, "2-3 Hours", "09:00 AM - 04:30 PM", "Where The Beatles stayed in 1968 to study transcendental meditation, filled with psychedelic murals and stone meditation domes.", "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80", Jsonb([]), 30.1130, 78.3120, ["Beatles Graffiti Hall", "Meditation Caves", "Rajaji Forest Edge"], "Great spot for photography and quiet reflection away from the city traffic.", "Swarg Ashram, Rishikesh"),
                ("ATT_RSK_03", "rishikesh", "Triveni Ghat Sunset Maha Aarti", "Spiritual", 4.9, 920, 0, "1.5 Hours", "06:00 PM - 07:30 PM", "A profoundly moving evening river ceremony with chanting priests, massive brass lamps, conch shells, and floating flower diyas.", "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80", Jsonb([]), 30.1060, 78.2930, ["Sacred Maha Aarti", "Ganga River Steps", "Floating Flower Diyas"], "Arrive by 05:30 PM to sit on the ghat steps right in front of the priests.", "Mayakund, Rishikesh"),

                # Kashmir
                ("ATT_KSH_01", "kashmir", "Dal Lake Shikara Cruise & Floating Market", "Scenic", 5.0, 940, 600, "2-3 Hours", "05:30 AM - 07:30 PM", "Gliding on calm waters surrounded by snow-capped Zabarwan mountains, historic wooden houseboats, and colorful floating vegetable markets.", "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80", Jsonb([]), 34.0837, 74.8373, ["Shikara Ride", "Floating Flower Bazaar", "Cedar Houseboats"], "Take the 5:30 AM sunrise ride to witness the ancient floating wholesale flower and vegetable market.", "Boulevard Road, Srinagar"),
                ("ATT_KSH_02", "kashmir", "Gulmarg Gondola & Apharwat Peak", "Adventure", 4.9, 880, 1850, "4-5 Hours", "09:00 AM - 04:00 PM", "One of the world's highest cable cars transporting visitors to 13,780 ft on Mount Apharwat for skiing, snow sports, and glacier vistas.", "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80", Jsonb([]), 34.0484, 74.3805, ["Phase 2 at 13,780 ft", "Snow Peak Panorama", "Himalayan Ski Slopes"], "Phase 2 tickets must be booked online weeks in advance due to strict daily caps.", "Gulmarg Resort, Kashmir"),

                # Varanasi
                ("ATT_VAR_01", "varanasi", "Dashashwamedh Ghat Grand Ganga Aarti", "Spiritual", 5.0, 1200, 0, "2 Hours", "06:00 PM - 08:00 PM", "A visually spectacular riverside spiritual ceremony with choreographed brass multi-tiered lamps, incense clouds, and rhythmic bells.", "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80", Jsonb([]), 25.3075, 83.0107, ["Brass Lamp Aarti", "Holy Ganges Steps", "Boat Vista"], "Hire a wooden rowboat to watch the aarti comfortably from the water.", "Dashashwamedh Ghat, Varanasi"),
                ("ATT_VAR_02", "varanasi", "Kashi Vishwanath Golden Corridor", "Spiritual", 4.9, 980, 0, "2-3 Hours", "04:00 AM - 11:00 PM", "One of the twelve sacred Jyotirlingas, featuring a magnificent gold-plated spire and a sweeping sandstone pedestrian corridor to the river.", "https://images.unsplash.com/photo-1571536802807-30451e3955d8?auto=format&fit=crop&w=800&q=80", Jsonb([]), 25.3109, 83.0107, ["Golden Spire", "Ganges Corridor", "Sacred Jyotirlinga"], "Deposit mobile phones and electronics in lockers before entering the temple complex.", "Lahori Tola, Varanasi"),
                ("ATT_VAR_03", "varanasi", "Sarnath Deer Park & Dhamek Stupa", "Heritage", 4.8, 510, 50, "3 Hours", "09:00 AM - 05:00 PM", "The sacred site where Gautama Buddha gave his first sermon, featuring the monolithic 43m high Dhamek Stupa and Ashoka Lion Capital.", "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80", Jsonb([]), 25.3811, 83.0214, ["Dhamek Stupa", "Ashoka Pillar & Museum", "Bodhi Tree Garden"], "Don't miss the Archaeological Museum displaying the original 4-lion Ashoka Capital emblem.", "Sarnath, Varanasi")
            ]
            for att in attractions:
                cur.execute("""
                INSERT INTO attractions (
                    id, destination_slug, name, category, rating, reviews_count, entry_fee,
                    duration, best_time, description, image, gallery, lat, lng, highlights,
                    insider_tip, address
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """, att)

        # Check & Seed Restaurants
        cur.execute("SELECT count(*) as count FROM restaurants")
        restaurant_count = cur.fetchone()["count"]
        if restaurant_count == 0:
            restaurants = [
                # Pondicherry
                ("RES_PDY_01", "pondicherry", "Villa Shanti French & Coastal Dining", "French & Contemporary Coastal", "₹₹₹", 2000, 4.8, 380, "14 Rue Suffren, White Town, Puducherry", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80", ["Seafood Bouillabaisse", "Stuffed Calamari", "Tandoori Tiger Prawns", "Crepe Suzette"], ["Seafood", "Vegan Friendly"], "An elegant 19th-century colonial courtyard restaurant serving exquisite French-Indian fusion cuisine.", 11.9345, 79.8339, "12:00 PM - 10:30 PM", "+91 413 420 0028", True),
                ("RES_PDY_02", "pondicherry", "Cafe des Arts Vintage French Bakery", "French Creperie & Artisan Bakery", "₹₹", 750, 4.7, 420, "10 Rue Suffren, White Town, Puducherry", "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80", ["Nutella Banana Crepe", "Croque Monsieur", "Iced Espresso Tonic", "Ratatouille Tart"], ["Pure Veg", "Vegan Friendly"], "A boho-chic yellow colonial villa featuring authentic Brittany crepes, fresh baguettes, and outdoor garden seating.", 11.9318, 79.8344, "08:30 AM - 07:00 PM", "+91 99944 81914", True),
                ("RES_PDY_03", "pondicherry", "Surguru Heritage South Indian", "Authentic South Indian & Chettinad", "₹", 380, 4.6, 610, "Sardar Vallabhai Patel Salai, Heritage Town, Puducherry", "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80", ["Ghee Podi Roast Dosa", "Filter Kaapi", "Mini Tiffin Platter", "Curd Vada"], ["Pure Veg"], "The gold standard for crispy golden dosas, steaming filter coffee, and traditional South Indian vegetarian tiffins.", 11.9380, 79.8300, "07:00 AM - 10:30 PM", "+91 413 222 7290", True),

                # Munnar
                ("RES_MNR_01", "munnar", "Rapsy Restaurant High Range", "Kerala & Malabar Spiced", "₹₹", 650, 4.7, 490, "Main Bazaar, Munnar Town, Kerala", "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80", ["Malabar Chicken Biryani", "Kerala Flaky Parotta", "Spanish Mushroom Omelette", "Cardamom Spiced Tea"], ["Halal", "Seafood"], "A legendary cozy diner famous for hearty mountain breakfasts, spicy beef and chicken curries, and cardamom tea.", 10.0880, 77.0600, "07:00 AM - 10:00 PM", "+91 4865 230 456", True),
                ("RES_MNR_02", "munnar", "Hill Spice Canopy Fine Dining", "Traditional Kerala Sadhya & Grill", "₹₹₹", 1800, 4.8, 220, "Tea County Road, High Range, Munnar", "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", ["Karimeen Pollichathu (Pearl Spot Fish)", "Bamboo Dum Biryani", "Tender Coconut Souffle"], ["Seafood", "Halal"], "Panoramic mountain-facing restaurant serving authentic banana-leaf wrapped grilled fish and spice plantation dishes.", 10.0910, 77.0620, "12:30 PM - 10:30 PM", "+91 4865 232 500", True),

                # Jaipur
                ("RES_JAI_01", "jaipur", "1135 AD at Amber Fort", "Royal Rajputana Fine Dining", "₹₹₹₹", 3600, 4.9, 580, "Level 2, Jaleb Chowk, Amber Fort, Jaipur", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80", ["Laal Maas (Slow Cooked Mathania Chilli Mutton)", "Maharaja Thali", "Murgh Badam Pasanda", "Shahi Tukda"], ["Halal", "Seafood", "Veg Friendly"], "Dine like Rajput royalty amidst silver chandeliers, gold-leaf enameled arches, and royal live sitar music inside Amber Fort.", 26.9850, 75.8510, "11:00 AM - 11:00 PM", "+91 141 253 0101", True),
                ("RES_JAI_02", "jaipur", "Laxmi Mishthan Bhandar (LMB)", "Authentic Rajasthani Vegetarian Heritage", "₹₹", 950, 4.7, 920, "Shop 98-101, Johari Bazaar, Pink City, Jaipur", "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80", ["Royal Rajasthani Thali", "Dal Baati Churma", "Pyaaz Kachori", "Paneer Ghewar"], ["Pure Veg"], "Founded in 1727 in the heart of Johari Bazaar, celebrated for the quintessential Rajasthani thali and melt-in-mouth sweets.", 26.9215, 75.8240, "08:00 AM - 10:30 PM", "+91 141 256 5844", True),

                # Goa
                ("RES_GOA_01", "goa", "The Fisherman's Wharf", "Authentic Goan Seafood & Portuguese", "₹₹₹", 2200, 4.8, 710, "Before the Cutbona Jetty, Mobor, Cavelossim, Goa", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80", ["Butter Garlic Jumbo Crab", "Goan Fish Curry Rice", "King Prawns Recheado", "Warm Bebinca with Ice Cream"], ["Seafood", "Halal"], "A sprawling riverside restaurant on the Sal river serving freshly caught Arabian Sea fish cooked in spicy coastal marinades.", 15.1580, 73.9480, "12:00 PM - 11:00 PM", "+91 832 287 1317", True),
                ("RES_GOA_02", "goa", "Thalassa Greek Cliffside Taverna", "Greek Mediterranean & Sunset Grill", "₹₹₹", 2600, 4.8, 890, "Vaddy, Siolim, North Goa", "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=800&q=80", ["Grilled Jumbo Tiger Prawns", "Greek Salad with Feta", "Lamb Souvlaki", "Crisp Baklava"], ["Seafood", "Halal", "Veg Friendly"], "Perched over the backwaters, famous for white Grecian decor, fiery sunset celebrations, and Mediterranean feasts.", 15.5860, 73.7430, "12:00 PM - 01:00 AM", "+91 98500 33537", True),

                # Ooty
                ("RES_OTY_01", "ooty", "Earl's Secret at King's Cliff", "Colonial Anglo-Indian & European", "₹₹₹", 1900, 4.8, 310, "King's Cliff, Havelock Road, Ooty", "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80", ["Shepherd's Pie", "Roast Chicken with Rosemary Jus", "Nilgiri Herb Soup", "Warm Chocolate Volcano"], ["Halal", "Veg Friendly"], "A glass-house colonial conservatory with a cozy stone fireplace, antique furniture, and hearty Anglo-Indian comfort cuisine.", 11.4120, 76.6900, "12:30 PM - 10:30 PM", "+91 423 245 2889", True),
                ("RES_OTY_02", "ooty", "Moddy's Artisan Bakery & Hot Chocolate", "Handcrafted Nilgiri Chocolates & Pastries", "₹", 450, 4.8, 670, "Garden Road, near Rose Garden, Ooty", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80", ["Signature Hot Chocolate Fudge", "Roasted Almond Fudge", "Almond Croissants", "Nilgiri Tea Scones"], ["Pure Veg"], "The benchmark for gourmet Nilgiri chocolate making since 1951, offering hot chocolate and fresh pastries.", 11.4070, 76.6980, "08:30 AM - 09:30 PM", "+91 423 244 2668", True),

                # Rishikesh
                ("RES_RSK_01", "rishikesh", "Little Buddha Cafe River View", "Himalayan Bohemian & Israeli", "₹₹", 750, 4.7, 540, "Near Laxman Jhula, Tapovan, Rishikesh", "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", ["Tibetan Steamed Momos", "Falafel Hummus Platter with Pita", "Fresh Ginger Lemon Honey Tea", "Shakshuka"], ["Pure Veg", "Vegan Friendly"], "A treehouse-style bamboo cafe overlooking the Ganges river, buzzing with travelers from all around the world.", 30.1320, 78.3260, "08:00 AM - 10:30 PM", "+91 94120 54321", True),
                ("RES_RSK_02", "rishikesh", "Chotiwala Heritage Restaurant", "Traditional Sattvic Garhwali Thali", "₹", 420, 4.6, 850, "Swarg Ashram, Rishikesh", "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80", ["Garhwali Special Thali", "Amritsari Chole Bhature", "Kadhai Paneer", "Fresh Rabdi Jalebi"], ["Pure Veg"], "Serving sattvic pure vegetarian meals without onion or garlic on the banks of the Ganges since 1958.", 30.1240, 78.3180, "07:00 AM - 10:30 PM", "+91 135 243 0079", True),

                # Kashmir
                ("RES_KSH_01", "kashmir", "Ahdoos Heritage Restaurant (Est. 1918)", "Legendary Kashmiri Wazwan", "₹₹₹", 1850, 4.9, 620, "Residency Road, Srinagar, Kashmir", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80", ["Gushtaba (Meatballs in Yoghurt Gravy)", "Mutton Rogan Josh", "Rista", "Tabak Maaz", "Kashmiri Phirni"], ["Halal"], "The crown jewel of traditional Wazwan dining in Srinagar for over a century, situated by the Jhelum river.", 34.0720, 74.8140, "11:30 AM - 10:30 PM", "+91 194 247 2593", True),
                ("RES_KSH_02", "kashmir", "Chai Jaai Artisanal Tea Room", "Kashmiri Pink Tea & Heritage Bakery", "₹₹", 680, 4.8, 390, "The Bund, near Polo Ground, Srinagar", "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80", ["Noon Chai (Kashmiri Pink Salt Tea)", "Shahi Saffron Kahwa with Almonds", "Bakarkhani", "Harissa with Lavasa"], ["Pure Veg", "Halal"], "A romantic French-Cousin tea room on the Bund inspired by Cottons of Srinagar, offering fragrant Kahwa and tea treats.", 34.0735, 74.8155, "09:00 AM - 09:00 PM", "+91 194 248 1000", True),

                # Varanasi
                ("RES_VAR_01", "varanasi", "Kashi Chaat Bhandar", "Legendary Banarasi Street Food", "₹", 320, 4.8, 980, "D.57/88, Girja Ghar Chauraha, Godowlia, Varanasi", "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80", ["Tamatar Chaat (Spiced Tomato & Cashew)", "Crispy Palak Patta Chaat", "Dahi Puri", "Gulab Jamun"], ["Pure Veg"], "The most famous chaat stall in Varanasi, serving sizzling earthenware bowls of ghee-roasted tomato chaat.", 25.3090, 83.0070, "03:30 PM - 10:30 PM", "+91 94505 45678", True),
                ("RES_VAR_02", "varanasi", "Shree Shivay Royal Sattvic Thali", "Grand Banarasi Thali & Desserts", "₹₹", 850, 4.7, 430, "Maldahiya, Varanasi", "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80", ["Unlimited Maharaja Silver Thali", "Banarasi Dum Aloo", "Papad Mangodi", "Malpua with Rabdi"], ["Pure Veg"], "A regal pure-vegetarian dining hall offering unlimited silver-platter servings of traditional Banarasi festive courses.", 25.3150, 83.0020, "11:30 AM - 10:30 PM", "+91 542 220 5400", True)
            ]
            for res in restaurants:
                cur.execute("""
                INSERT INTO restaurants (
                    id, destination_slug, name, cuisine, price_tier, avg_cost_for_two,
                    rating, reviews_count, address, image, signature_dishes, dietary_options,
                    description, lat, lng, opening_hours, phone, is_featured
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """, res)

        conn.commit()
