"""
Shree Ganesh Dairy Management System
------------------------------------
Database initializer for local SQLite3 database.

This script creates all required tables:
- users
- farmers
- milk_records
- shift_tracker
- rate_table
- farmer_advances
- sales_records

Run once before launching the main application.
"""

import sqlite3
from datetime import date

DB_PATH = "database.db"

# -------------------------------
# DATABASE CONNECTION
# -------------------------------

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# -------------------------------
# USERS TABLE
# -------------------------------

c.execute(
    """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
"""
)

# Default admin user
c.execute(
    "INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)",
    ("admin", "12345"),
)

# -------------------------------
# FARMERS TABLE
# -------------------------------

c.execute(
    """
CREATE TABLE IF NOT EXISTS farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT
)
"""
)

# Seed demo farmers (optional)
sample_farmers = [
    ("F001", "Suresh Patil", "A"),
    ("F002", "Ramesh Gaikwad", "B"),
    ("F003", "Maya Chavan", "C"),
]
for code, name, cat in sample_farmers:
    c.execute(
        "INSERT OR IGNORE INTO farmers (code, name, category) VALUES (?, ?, ?)",
        (code, name, cat),
    )

# -------------------------------
# MILK RECORDS TABLE
# -------------------------------

c.execute(
    """
CREATE TABLE IF NOT EXISTS milk_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rec_date TEXT NOT NULL,
    farmer_code TEXT,
    farmer_name TEXT,
    category TEXT,
    shift TEXT,
    litres REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    snf REAL DEFAULT 0,
    rate REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
)
"""
)

# -------------------------------
# SHIFT TRACKER TABLE
# -------------------------------

c.execute(
    """
CREATE TABLE IF NOT EXISTS shift_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    current_shift TEXT DEFAULT 'Morning',
    current_date TEXT DEFAULT (date('now'))
)
"""
)

# Seed default shift record
c.execute(
    """
INSERT OR IGNORE INTO shift_tracker (id, current_shift, current_date)
VALUES (1, 'Morning', date('now'))
"""
)

# -------------------------------
# RATE TABLE (Base + Fat + SNF Formula)
# -------------------------------

c.execute(
    """
CREATE TABLE IF NOT EXISTS rate_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT UNIQUE NOT NULL,
    base REAL DEFAULT 0,
    fat_rate REAL DEFAULT 0,
    snf_rate REAL DEFAULT 0
)
"""
)

# Default rate formulas
default_rates = [
    ("Cow", 20.0, 5.0, 3.0),
    ("Buffalo", 25.0, 6.5, 3.5),
]
for cat, base, fat_rate, snf_rate in default_rates:
    c.execute(
        """INSERT OR IGNORE INTO rate_table (category, base, fat_rate, snf_rate)
           VALUES (?, ?, ?, ?)""",
        (cat, base, fat_rate, snf_rate),
    )

# -------------------------------
# FARMER ADVANCES TABLE
# -------------------------------

c.execute(
    """
CREATE TABLE IF NOT EXISTS farmer_advances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_code TEXT,
    date TEXT,
    amount REAL DEFAULT 0,
    remarks TEXT
)
"""
)

# -------------------------------
# MILK SALES TABLE
# -------------------------------

c.execute(
    """
CREATE TABLE IF NOT EXISTS sales_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_date TEXT,
    customer TEXT,
    litres REAL DEFAULT 0,
    rate REAL DEFAULT 0,
    amount REAL DEFAULT 0
)
"""
)

# -------------------------------
# FINALIZE
# -------------------------------

conn.commit()
conn.close()

print("✅ Database created/updated successfully.")
print("🔑 Default admin credentials: username='admin', password='12345'")
