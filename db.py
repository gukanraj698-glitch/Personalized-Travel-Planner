import os, uuid, json, sqlite3
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:6381/wanderly")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

IS_POSTGRES = False
pool = None

# Attempt to connect to PostgreSQL if available
try:
    import psycopg
    from psycopg_pool import ConnectionPool
    from psycopg.rows import dict_row

    test_conn = psycopg.connect(DATABASE_URL, connect_timeout=2)
    test_conn.close()
    
    pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=15, kwargs={"row_factory": dict_row}, open=True)
    IS_POSTGRES = True
    print("[DB ENGINE] Connected to PostgreSQL successfully!")
except Exception as e:
    print(f"[DB ENGINE] PostgreSQL not reachable. Using embedded resilient SQLite engine.")
    IS_POSTGRES = False

# Vercel / AWS Lambda has a read-only filesystem except /tmp
if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or not os.access(".", os.W_OK):
    SQLITE_PATH = "/tmp/wanderly_local.db"
else:
    SQLITE_PATH = os.path.join(os.path.dirname(__file__), "wanderly_local.db")

class SQLiteCursorWrapper:
    def __init__(self, cur):
        self.cur = cur

    def execute(self, query, params=None):
        q = query.replace("%s", "?")
        q = q.replace("is_active=true", "is_active=1").replace("is_active=false", "is_active=0")
        q = q.replace("ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash, loyalty_points = 5000, tier = 'Platinum';", "")
        q = q.replace("ON CONFLICT (email) DO NOTHING;", "")
        q = q.replace("ON CONFLICT (id) DO NOTHING;", "")
        q = q.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
        q = q.replace("TIMESTAMPTZ", "TEXT").replace("UUID", "TEXT").replace("JSONB", "TEXT").replace("JSON", "TEXT").replace("NUMERIC(10,2)", "REAL")
        
        if params is None:
            return self.cur.execute(q)
        clean_params = []
        for p in params:
            if isinstance(p, (dict, list)):
                clean_params.append(json.dumps(p))
            else:
                clean_params.append(p)
        return self.cur.execute(q, tuple(clean_params))

    def fetchone(self):
        row = self.cur.fetchone()
        return dict(row) if row is not None else None

    def fetchall(self):
        rows = self.cur.fetchall()
        return [dict(r) for r in rows]

class SQLiteConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn

    def cursor(self):
        return SQLiteCursorWrapper(self.conn.cursor())

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.commit()
        self.close()

class DatabaseManager:
    def connection(self):
        if IS_POSTGRES and pool is not None:
            try:
                if pool.closed:
                    pool.open(wait=False)
                return pool.connection()
            except Exception:
                pass
        s_conn = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
        s_conn.row_factory = sqlite3.Row
        return SQLiteConnectionWrapper(s_conn)

db_manager = DatabaseManager()

def get_db():
    return db_manager.connection()

def init_db():
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # 1. Users
                cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    full_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    phone TEXT,
                    loyalty_points INTEGER DEFAULT 250,
                    tier TEXT DEFAULT 'Silver',
                    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                """)

                # 2. Destinations
                cur.execute("""
                CREATE TABLE IF NOT EXISTS destinations (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    state TEXT NOT NULL,
                    country TEXT DEFAULT 'India',
                    slug TEXT UNIQUE NOT NULL,
                    tagline TEXT,
                    description TEXT,
                    image TEXT,
                    rating REAL DEFAULT 4.5,
                    budget REAL DEFAULT 5000,
                    days INTEGER DEFAULT 3,
                    best_time TEXT,
                    weather_temp REAL DEFAULT 24.0,
                    weather_condition TEXT DEFAULT 'Sunny',
                    air_quality_index INTEGER DEFAULT 45,
                    category TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                """)

                # 3. Hotels
                cur.execute("""
                CREATE TABLE IF NOT EXISTS hotels (
                    id TEXT PRIMARY KEY,
                    destination_slug TEXT,
                    name TEXT NOT NULL,
                    rating REAL DEFAULT 4.5,
                    price_per_night REAL DEFAULT 2500,
                    address TEXT,
                    image TEXT,
                    amenities TEXT
                );
                """)

                # 4. Attractions
                cur.execute("""
                CREATE TABLE IF NOT EXISTS attractions (
                    id TEXT PRIMARY KEY,
                    destination_slug TEXT NOT NULL,
                    name TEXT NOT NULL,
                    category TEXT,
                    rating REAL DEFAULT 4.5,
                    entry_fee REAL DEFAULT 0,
                    duration TEXT,
                    best_time TEXT,
                    description TEXT,
                    image TEXT
                );
                """)

                # 5. Restaurants
                cur.execute("""
                CREATE TABLE IF NOT EXISTS restaurants (
                    id TEXT PRIMARY KEY,
                    destination_slug TEXT NOT NULL,
                    name TEXT NOT NULL,
                    cuisine TEXT,
                    price_tier TEXT DEFAULT '₹₹',
                    avg_cost_for_two REAL DEFAULT 800,
                    rating REAL DEFAULT 4.5,
                    address TEXT,
                    image TEXT
                );
                """)

                # 6. Flights
                cur.execute("""
                CREATE TABLE IF NOT EXISTS flights (
                    id TEXT PRIMARY KEY,
                    airline TEXT NOT NULL,
                    flight_number TEXT NOT NULL,
                    departure_city TEXT NOT NULL,
                    arrival_city TEXT NOT NULL,
                    price REAL NOT NULL,
                    duration TEXT,
                    stops TEXT DEFAULT 'Non-stop'
                );
                """)

                # 7. Tours
                cur.execute("""
                CREATE TABLE IF NOT EXISTS tours (
                    id TEXT PRIMARY KEY,
                    destination TEXT NOT NULL,
                    title TEXT NOT NULL,
                    duration TEXT,
                    price REAL NOT NULL,
                    rating REAL DEFAULT 4.8,
                    image TEXT
                );
                """)

                # 8. Bookings
                cur.execute("""
                CREATE TABLE IF NOT EXISTS bookings (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    booking_ref TEXT,
                    booking_type TEXT DEFAULT 'package',
                    item_id TEXT,
                    item_name TEXT,
                    place TEXT NOT NULL,
                    start_date TEXT,
                    end_date TEXT,
                    guests INTEGER DEFAULT 1,
                    total_amount REAL NOT NULL,
                    status TEXT DEFAULT 'confirmed',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                """)

                # 9. Coupons
                cur.execute("""
                CREATE TABLE IF NOT EXISTS coupons (
                    code TEXT PRIMARY KEY,
                    discount_percent INTEGER NOT NULL,
                    min_spend REAL DEFAULT 0,
                    is_active INTEGER DEFAULT 1
                );
                """)

                # 10. Wishlists
                cur.execute("""
                CREATE TABLE IF NOT EXISTS wishlists (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    item_type TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    item_title TEXT,
                    item_image TEXT
                );
                """)

                conn.commit()

        seed_data()
    except Exception as e:
        print(f"[DB INIT ERROR]: {e}")

def seed_data():
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Seed Users
                cur.execute("SELECT id FROM users WHERE email=%s", ('admin@wanderly.com',))
                if not cur.fetchone():
                    cur.execute("""
                    INSERT INTO users (id, full_name, email, password_hash, role, phone, loyalty_points, tier)
                    VALUES (%s, 'Wanderly Enterprise Admin', 'admin@wanderly.com', %s, 'admin', '+91 9876543210', 5000, 'Platinum')
                    """, (str(uuid.uuid4()), generate_password_hash("admin123")))

                cur.execute("SELECT id FROM users WHERE email=%s", ('traveller@wanderly.com',))
                if not cur.fetchone():
                    cur.execute("""
                    INSERT INTO users (id, full_name, email, password_hash, role, phone, loyalty_points, tier)
                    VALUES (%s, 'Jane Traveller', 'traveller@wanderly.com', %s, 'user', '+91 9876543211', 850, 'Gold')
                    """, (str(uuid.uuid4()), generate_password_hash("password123")))

                # Seed Destinations
                destinations = [
                    (1, "Pondicherry", "Tamil Nadu", "India", "pondicherry", "French Colonial Quarters & Serene Bay of Bengal", "A vibrant coastal sanctuary with French heritage, pastel villas, and serene promenades.", "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80", 4.8, 5500, 3, "Oct - Mar", 28.5, "Sunny Coast", 32, "['Heritage', 'Beach', 'Spiritual']"),
                    (2, "Munnar", "Kerala", "India", "munnar", "Emerald Tea Estates & Misty Western Ghats", "Rolling tea plantations, misty hill valleys, and refreshing mountain waterfalls.", "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80", 4.9, 7500, 3, "Sep - May", 18.2, "Misty Hilltop", 18, "['Nature', 'Hills', 'Romance']"),
                    (3, "Jaipur", "Rajasthan", "India", "jaipur", "Pink City Palaces & Royal Rajputana Heritage", "Grand sandstone forts, royal palaces, vibrant bazaars, and opulent Rajasthani heritage.", "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80", 4.7, 9500, 3, "Oct - Mar", 24.0, "Sunny", 55, "['Heritage', 'Culture', 'Architecture']"),
                    (4, "Goa", "Goa", "India", "goa", "Sun-Kissed Beaches, Portuguese Forts & Nightlife", "Golden sandy beaches, vibrant seaside shacks, historic churches, and water sports.", "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80", 4.8, 8500, 4, "Nov - Feb", 30.0, "Tropical Coast", 28, "['Beach', 'Nightlife', 'Relaxation']"),
                    (5, "Ooty", "Tamil Nadu", "India", "ooty", "Queen of Nilgiri Hills & Colonial Botanical Charms", "Charming pine forests, heritage toy train rides, and pleasant tea-clad mountain summits.", "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80", 4.6, 6000, 2, "All Year", 16.5, "Cool Breeze", 15, "['Hills', 'Nature', 'Family']"),
                    (6, "Rishikesh", "Uttarakhand", "India", "rishikesh", "Yoga Capital of the World & Holy Ganges White Waters", "Spirituality meets white-water river rafting, Himalayan yoga ashrams, and Ganga Aarti.", "https://images.unsplash.com/photo-1600100397608-f010f443b2f8?auto=format&fit=crop&w=800&q=80", 4.9, 7800, 3, "Sep - Nov", 22.0, "Pleasant Alpine", 20, "['Adventure', 'Spiritual', 'Wellness']"),
                    (7, "Srinagar & Gulmarg", "Kashmir", "India", "kashmir", "Paradise on Earth · Shikaras, Saffron & Snow Slopes", "Romantic Dal Lake houseboats, Mughal gardens, and powdery snow gondola peaks in Gulmarg.", "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80", 4.9, 12500, 4, "Mar - Oct", 12.0, "Crisp Snow Valley", 12, "['Hills', 'Snow', 'Romance', 'Scenic']"),
                    (8, "Varanasi", "Uttar Pradesh", "India", "varanasi", "Ancient Spiritual Ghats & Sacred Ganga River Aarti", "One of the world's oldest living spiritual cities with majestic evening Ganga Aarti.", "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80", 4.7, 6500, 3, "Oct - Mar", 25.5, "Spiritual Riverbank", 62, "['Spiritual', 'Culture', 'Heritage']")
                ]
                for d in destinations:
                    cur.execute("SELECT id FROM destinations WHERE id=%s", (d[0],))
                    if not cur.fetchone():
                        cur.execute("""
                        INSERT INTO destinations (id, name, state, country, slug, tagline, description, image, rating, budget, days, best_time, weather_temp, weather_condition, air_quality_index, category)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, d)

                # Seed Hotels
                hotels = [
                    ("H001", "pondicherry", "Le Pondy Beach Resort & Spa", 4.8, 6200, "Lake View Road, Pondicherry", "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80", "Pool, Spa, Ocean View"),
                    ("H002", "munnar", "The Panoramic Getaway Hills", 4.9, 7800, "Chithirapuram, Munnar", "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80", "Infinity Pool, Mountain View"),
                    ("H003", "goa", "Taj Exotica Resort & Spa", 4.9, 14500, "Benaulim, South Goa", "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80", "Private Beach, Golf, Luxury Villas"),
                    ("H004", "jaipur", "ITC Rajputana Luxury Collection", 4.8, 8900, "Palace Road, Jaipur", "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80", "Royal Architecture, Heritage Spa")
                ]
                for h in hotels:
                    cur.execute("SELECT id FROM hotels WHERE id=%s", (h[0],))
                    if not cur.fetchone():
                        cur.execute("INSERT INTO hotels (id, destination_slug, name, rating, price_per_night, address, image, amenities) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", h)

                # Seed Flights
                flights = [
                    ("FL001", "Air India", "AI-504", "DEL", "PNY", 4800, "2h 15m", "Non-stop"),
                    ("FL002", "IndiGo", "6E-212", "BOM", "COK", 3900, "1h 50m", "Non-stop"),
                    ("FL003", "Vistara", "UK-871", "DEL", "GOI", 5600, "2h 30m", "Non-stop")
                ]
                for f in flights:
                    cur.execute("SELECT id FROM flights WHERE id=%s", (f[0],))
                    if not cur.fetchone():
                        cur.execute("INSERT INTO flights (id, airline, flight_number, departure_city, arrival_city, price, duration, stops) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", f)

                # Seed Tours
                tours = [
                    ("TR001", "Pondicherry", "French Quarter Heritage Walk & Auroville Tour", "4 Hours", 1200, 4.9, "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80"),
                    ("TR002", "Munnar", "Kolukkumalai Tea Sunrise 4x4 Jeep Safari", "6 Hours", 2400, 4.9, "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80"),
                    ("TR003", "Goa", "Grand Island Dolphin & Scuba Diving Cruise", "7 Hours", 3100, 4.8, "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80")
                ]
                for t in tours:
                    cur.execute("SELECT id FROM tours WHERE id=%s", (t[0],))
                    if not cur.fetchone():
                        cur.execute("INSERT INTO tours (id, destination, title, duration, price, rating, image) VALUES (%s, %s, %s, %s, %s, %s, %s)", t)

                # Seed Coupons
                coupons = [
                    ("WANDERLY20", 20, 3000, True),
                    ("SUMMER15", 15, 2000, True),
                    ("FIRSTTRIP", 25, 4000, True),
                    ("VIPPLATINUM", 30, 5000, True)
                ]
                for c in coupons:
                    cur.execute("SELECT code FROM coupons WHERE code=%s", (c[0],))
                    if not cur.fetchone():
                        cur.execute("INSERT INTO coupons (code, discount_percent, min_spend, is_active) VALUES (%s, %s, %s, %s)", c)

                conn.commit()
    except Exception as e:
        print(f"[DB SEED ERROR]: {e}")
