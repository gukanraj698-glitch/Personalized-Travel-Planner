import os
import db
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = db.DATABASE_URL

def clean_str(val, max_len=28):
    if val is None:
        return ""
    s = str(val).replace('₹', 'Rs.').replace('💎', '*').replace('🟢', '[ON]').replace('🔴', '[OFF]')
    s = s.encode('ascii', errors='replace').decode('ascii')
    return s[:max_len]

def display_table(title, rows, columns):
    print("\n" + "="*85)
    print(f" [TABLE] {title.upper()} (Total Records: {len(rows)})")
    print("="*85)
    if not rows:
        print("  [No records found]")
        return
    
    col_widths = {}
    for col in columns:
        col_widths[col] = max(len(col), max((len(clean_str(r.get(col, ''))) for r in rows), default=0)) + 2

    header = "".join(f"{col.upper():<{col_widths[col]}}" for col in columns)
    print(header)
    print("-" * len(header))

    for r in rows[:10]:
        row_str = "".join(f"{clean_str(r.get(col, '')):<{col_widths[col]}}" for col in columns)
        print(row_str)
    
    if len(rows) > 10:
        print(f"  ... and {len(rows) - 10} more rows")

def main():
    print("\n" + "="*85)
    print("   [WANDERLY ENTERPRISE] POSTGRESQL DATABASE VIEWER")
    print("="*85)
    print(f"Connecting to database: wanderly (Port 6381) ...")

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Get all public tables
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema='public' 
                ORDER BY table_name ASC
            """)
            tables = [r['table_name'] for r in cur.fetchall()]
            print(f"\nDiscovered {len(tables)} Public Tables: {', '.join(tables)}")

            for table in tables:
                cur.execute(f"SELECT * FROM {table} LIMIT 10")
                sample_rows = cur.fetchall()
                if sample_rows:
                    cols = list(sample_rows[0].keys())[:6] # Display first 6 columns
                    display_table(table, sample_rows, cols)
                else:
                    display_table(table, [], ["info"])

    print("\n" + "="*85)
    print(" [OK] All PostgreSQL tables inspected successfully!")
    print("="*85 + "\n")

if __name__ == "__main__":
    main()
