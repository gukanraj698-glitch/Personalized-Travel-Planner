import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = "postgresql://postgres:1234@localhost:6381/wanderly"

def show_data():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            print("=" * 80)
            print("            WANDERLY ENTERPRISE POSTGRESQL DATA VIEWER")
            print("=" * 80)

            # 1. Users
            cur.execute("SELECT id, full_name, email, role, loyalty_points, tier, created_at FROM users ORDER BY created_at DESC")
            users = cur.fetchall()
            print(f"\n[1] USERS TABLE ({len(users)} records):")
            print("-" * 80)
            for u in users:
                print(f"  • [{u['role'].upper()}] {u['full_name']} <{u['email']}> | Tier: {u['tier']} | Points: 💎 {u['loyalty_points']}")

            # 2. Bookings
            cur.execute("SELECT booking_ref, booking_type, item_name, place, check_in, check_out, total_amount, status, payment_status FROM bookings ORDER BY created_at DESC")
            bookings = cur.fetchall()
            print(f"\n[2] BOOKINGS TABLE ({len(bookings)} records):")
            print("-" * 80)
            for b in bookings:
                print(f"  • {b['booking_ref']} | {b['booking_type'].upper()} | {b['item_name']} ({b['place']}) | ₹{float(b['total_amount']):,.2f} | Status: {b['status']} | Payment: {b['payment_status']}")

            # 3. Saved Itineraries
            cur.execute("SELECT id, title, destination, days, travel_style, total_estimated_cost FROM saved_itineraries ORDER BY created_at DESC")
            itins = cur.fetchall()
            print(f"\n[3] SAVED ITINERARIES TABLE ({len(itins)} records):")
            print("-" * 80)
            for it in itins:
                print(f"  • {it['title']} ({it['destination']}) | Style: {it['travel_style']} | Estimated: ₹{float(it['total_estimated_cost'] or 0):,.2f}")

            # 4. Destinations
            cur.execute("SELECT name, state, budget, rating, days FROM destinations ORDER BY rating DESC")
            dests = cur.fetchall()
            print(f"\n[4] DESTINATIONS CATALOG ({len(dests)} records):")
            print("-" * 80)
            for d in dests:
                print(f"  • {d['name']}, {d['state']} | ★ {float(d['rating'])} | {d['days']} Days | Budget: ₹{float(d['budget']):,.0f}")

            # 5. Hotels
            cur.execute("SELECT id, name, place, price_per_night, rating FROM hotels ORDER BY rating DESC")
            hotels = cur.fetchall()
            print(f"\n[5] LUXURY RESORTS & STAYS ({len(hotels)} records):")
            print("-" * 80)
            for h in hotels:
                print(f"  • [{h['id']}] {h['name']} ({h['place']}) | ★ {float(h['rating'])} | ₹{float(h['price_per_night']):,.0f} / night")

            # 6. Flights
            cur.execute("SELECT flight_no, airline, origin, destination, departure_time, price FROM flights ORDER BY price ASC")
            flights = cur.fetchall()
            print(f"\n[6] SCHEDULED FLIGHTS ({len(flights)} records):")
            print("-" * 80)
            for f in flights:
                print(f"  • {f['airline']} {f['flight_no']} | {f['origin']} ➔ {f['destination']} @ {f['departure_time']} | ₹{float(f['price']):,.0f}")

            # 7. Support Tickets
            cur.execute("SELECT ticket_ref, user_name, subject, priority, status FROM support_tickets ORDER BY created_at DESC")
            tickets = cur.fetchall()
            print(f"\n[7] SUPPORT TICKETS ({len(tickets)} records):")
            print("-" * 80)
            for t in tickets:
                print(f"  • [{t['ticket_ref']}] From: {t['user_name']} | Subject: {t['subject']} | Priority: {t['priority']} | Status: {t['status']}")

            # 8. Active Coupons
            cur.execute("SELECT code, discount_percent, max_discount, min_spend FROM coupons WHERE is_active=true")
            coupons = cur.fetchall()
            print(f"\n[8] PROMOTIONAL COUPONS ({len(coupons)} records):")
            print("-" * 80)
            for c in coupons:
                print(f"  • Code: {c['code']} | {c['discount_percent']}% OFF (Up to ₹{float(c['max_discount']):,.0f} on min ₹{float(c['min_spend']):,.0f})")

            print("\n" + "=" * 80)

if __name__ == "__main__":
    show_data()
