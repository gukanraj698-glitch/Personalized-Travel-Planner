# Wanderly Enterprise · Global Travel Management OS

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.2-green.svg)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-Proprietary%20Enterprise-black.svg)]()

**Wanderly Enterprise** is a full-scale commercial travel and hospitality platform backed by PostgreSQL. It provides smart destination discovery, verified luxury stays booking, flight ticketing, curated outdoor tours, AI-driven day-by-day travel planning, loyalty rewards, digital tax invoicing, and an enterprise operations admin console.

---

## 🌟 Enterprise Feature Matrix

### 1. Multi-Category Booking Engine
- **Luxury Resorts & Stays**: Room tier selection (Deluxe, Suite, Villa), experience add-ons (Buffet breakfast, Chauffeur airport transfer), real-time tax calculation (GST 12%), and coupon discount redemption.
- **Flight Ticketing**: Scheduled domestic & international routes, baggage allowances, seat inventory, and simulated boarding pass issuance.
- **Tours & Activities**: PADI diving in Goa, 4x4 sunrise jeep safaris in Munnar, whitewater rafting in Rishikesh, and heritage night walks in Jaipur.

### 2. AI Smart Itinerary Planner
- Multi-factor custom travel plan generator factoring in destination, duration (1-7 days), travel style (Adventure, Culture, Relaxation, Foodie, Balanced), and budget tier.
- Complete daily timeline (Morning, Afternoon, Evening, Night), packing checklist, weather advisories, and estimated total budget.
- 1-click **Save to PostgreSQL** and **Print/Export to PDF**.

### 3. Digital Financials & Tax Invoicing
- Complete PDF/Print-ready Tax Invoice generation (`INV-2026-WY-XXXX`) with itemized subtotal, GST/VAT breakdown, and payment confirmation.
- 1-click cancellation with automated refund tracking.

### 4. Privilege Loyalty Club & Rewards
- Tier progression (Bronze $\rightarrow$ Silver $\rightarrow$ Gold $\rightarrow$ Platinum VIP).
- Earn 5% points on every trip + 50 points on writing verified reviews.
- Active enterprise promotional codes: `WELCOME10`, `WANDER2026`, `LUXURY500`, `CORPORATE`.

### 5. Multi-Currency & Dark/Light Mode
- Real-time dynamic currency switcher: **₹ INR**, **$ USD**, **€ EUR**, **£ GBP**, **AED د.إ**.
- Seamless dark and light glassmorphic theme.

### 6. Operations & Admin Management Console (`/admin`)
- Executive KPI dashboard: Total Gross Revenue, Verified Bookings, Average Order Value (AOV), Active Users.
- Booking Lifecycle Manager (Confirmed, Completed, Cancelled, Refunded).
- User & Loyalty Registry (Tier upgrades, reward points adjustments).
- 24/7 Concierge Support Inbox with live ticket reply desk.

---

## 🏗️ PostgreSQL Database Schema

The platform uses 11 relational tables in PostgreSQL:

```
├── users                 (UUID, Name, Email, Password Hash, Role, Loyalty Points, Tier, Avatar)
├── destinations          (Slug, Name, State, Country, Budget, Rating, Highlights, Geo Lat/Lng, Gallery)
├── hotels                (ID, Name, Place, Price Per Night, Rating, Features, Room Types JSONB)
├── flights               (ID, Flight No, Airline, Origin, Destination, Times, Price, Seats)
├── tours                 (ID, Destination, Title, Duration, Price, Rating, Highlights, Included)
├── bookings              (UUID, Booking Ref, User ID, Type, Item Name, Dates, Financials, Status)
├── saved_itineraries     (UUID, User ID, Destination, Days, Style, Budget, Plan JSONB)
├── wishlists             (ID, User ID, Item Type, Item ID, Title, Image, Price)
├── reviews               (ID, User ID, Item Type, Item ID, Rating, Title, Comment)
├── coupons               (Code, Discount %, Max Discount, Min Spend, Is Active)
└── support_tickets       (UUID, Ticket Ref, User ID, Subject, Category, Status, Message, Reply)
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- PostgreSQL 17 (Running on `localhost:6381` or configured via `.env`)

### 2. Configuration (`.env`)
```env
DATABASE_URL=postgresql://postgres:1234@localhost:6381/wanderly
SECRET_KEY=wanderly-enterprise-secret-key-2026
PORT=5000
```

### 3. Run the Application
```powershell
python app.py
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## 🔑 Demo Test Accounts

| Account Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Enterprise Admin** | `admin@wanderly.com` | `admin123` | Full Operations Console (`/admin`) |
| **Regular Traveller** | `traveller@wanderly.com` | `password123` | Booking, Planner, Wishlist, Reviews |

---

## 🛠️ Developer & Inspection Tools

- **Inspect All PostgreSQL Data**:
  ```powershell
  python view_data.py
  ```
- **Run Automated Test Suite**:
  ```powershell
  python ../../brain/e9c6a595-25aa-41a8-bf8b-ca70d982e04c/scratch/test_enterprise_suite.py
  ```
