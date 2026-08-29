import os, uuid, json, sqlite3
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:6381/wanderly")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

IS_POSTGRES = False
pool = None

# Attempt to import psycopg and test PostgreSQL connection
try:
    import psycopg
    from psycopg_pool import ConnectionPool
    from psycopg.rows import dict_row

    # Test if PostgreSQL is reachable
    test_conn = psycopg.connect(DATABASE_URL, connect_timeout=3)
    test_conn.close()
    
    pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=15, kwargs={"row_factory": dict_row}, open=True)
    IS_POSTGRES = True
    print("[DB ENGINE] Connected successfully to PostgreSQL!")
except Exception as e:
    print(f"[DB ENGINE] PostgreSQL not available ({e}). Falling back to built-in SQLite engine.")
    IS_POSTGRES = False

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "wanderly_local.db")

class SQLiteCursorWrapper:
    def __init__(self, cur):
        self.cur = cur

    def execute(self, query, params=None):
        # Convert %s placeholder to ? placeholder for SQLite
        q = query.replace("%s", "?")
        # Remove PostgreSQL specific clauses
        q = q.replace("ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash, loyalty_points = 5000, tier = 'Platinum';", "")
        q = q.replace("ON CONFLICT (email) DO NOTHING;", "")
        q = q.replace("ON CONFLICT (id) DO NOTHING;", "")
        q = q.replace("ON CONFLICT (code) DO NOTHING;", "")
        q = q.replace("TIMESTAMPTZ", "TEXT").replace("UUID", "TEXT").replace("JSONB", "TEXT").replace("JSON", "TEXT")
        
        if params is None:
            return self.cur.execute(q)
        # Convert any dict/list params to json strings for SQLite
        clean_params = []
        for p in params:
            if isinstance(p, (dict, list)):
                clean_params.append(json.dumps(p))
            else:
                clean_params.append(p)
        return self.cur.execute(q, tuple(clean_params))

    def fetchone(self):
        row = self.cur.fetchone()
        if row is None:
            return None
        return dict(row)

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
        # SQLite fallback connection
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
                # 1. Users Table
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

                # 2. Destinations Table
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

                # 3. Bookings Table
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

                # 4. Attractions Table
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

                # 5. Restaurants Table
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

                # 6. Coupons Table
                cur.execute("""
                CREATE TABLE IF NOT EXISTS coupons (
                    id INTEGER PRIMARY KEY,
                    code TEXT UNIQUE NOT NULL,
                    discount_percent INTEGER NOT NULL,
                    min_spend REAL DEFAULT 0,
                    is_active INTEGER DEFAULT 1
                );
                """)

                # 7. Wishlists Table
                cur.execute("""
                CREATE TABLE IF NOT EXISTS wishlists (
                    id INTEGER PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    item_type TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    item_title TEXT,
                    item_image TEXT
                );
                """)

                conn.commit()

        # Seed initial data
        seed_data()
    except Exception as e:
        print(f"[DB INIT STATUS]: {e}")

def seed_data():
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Seed Admin
                cur.execute("SELECT id FROM users WHERE email=%s", ('admin@wanderly.com',))
                if not cur.fetchone():
                    cur.execute("""
                    INSERT INTO users (id, full_name, email, password_hash, role, phone, loyalty_points, tier)
                    VALUES (%s, 'Wanderly Enterprise Admin', 'admin@wanderly.com', %s, 'admin', '+91 9876543210', 5000, 'Platinum')
                    """, (str(uuid.uuid4()), generate_password_hash("admin123")))

                # Seed Traveller
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

                # Seed Coupons
                coupons = [
                    ("WANDERLY20", 20, 3000, 1),
                    ("SUMMER15", 15, 2000, 1),
                    ("FIRSTTRIP", 25, 4000, 1),
                    ("VIPPLATINUM", 30, 5000, 1)
                ]
                for c in coupons:
                    try:
                        cur.execute("SELECT code FROM coupons WHERE code=%s", (c[0],))
                        if not cur.fetchone():
                            cur.execute("INSERT INTO coupons (code, discount_percent, min_spend, is_active) VALUES (%s, %s, %s, %s)", c)
                    except Exception:
                        pass

                conn.commit()
    except Exception as e:
        print(f"[DB SEED STATUS]: {e}")
