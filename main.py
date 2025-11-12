import os
import sys
import json
import sqlite3
import threading
import time
import base64
from datetime import datetime
from tkinter import filedialog
import tkinter as tk
import webview
import shutil

# ================================================================
#  DATABASE HANDLER — ensures correct DB copy for packaged .exe
# ================================================================

APP_NAME = "Varad_Dairy"

#  Folder for user data (this is where real DB will live)
user_data_dir = os.path.join(os.path.expanduser("~"), "Documents", APP_NAME)
os.makedirs(user_data_dir, exist_ok=True)

#  Actual working database path
DB = os.path.join(user_data_dir, "database.db")

#  Determine where the bundled database.db is located
if getattr(sys, "frozen", False):
    # Running from .exe — PyInstaller unpacks here
    base_path = sys._MEIPASS
else:
    # Running directly from source
    base_path = os.path.dirname(os.path.abspath(__file__))

#  Path to default database (the one inside your source or packaged folder)
src_db = os.path.join(base_path, "database.db")

#  Copy starter DB only if missing
if not os.path.exists(DB):
    try:
        if os.path.exists(src_db):
            print(f"Copying starter database to {DB}")
            shutil.copy(src_db, DB)
        else:
            print("Starter database not found. Creating blank one...")
            open(DB, "w").close()
    except Exception as e:
        print(" Error copying database:", e)

# Threading lock for SQLite
lock = threading.Lock()


#  Helper for easy conversion (used everywhere)
def query_dicts(cursor):
    """Convert SQLite cursor results to list of dictionaries"""
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


class Api:

    # -------------------------------
    # LOGIN
    # -------------------------------
    def login(self, data):
        try:
            payload = json.loads(data)
            username = payload.get("username")
            password = payload.get("password")

            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute(
                "SELECT id FROM users WHERE username=? AND password=?",
                (username, password),
            )
            user = c.fetchone()
            conn.close()

            if user:
                return json.dumps({"success": True, "message": "Login successful!"})
            else:
                return json.dumps(
                    {"success": False, "message": "Invalid username or password!"}
                )
        except Exception as e:
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # SUMMARY
    # -------------------------------
    def get_summary(self, data):
        try:
            payload = json.loads(data or "{}")
            rec_date = payload.get("date")
            shift = payload.get("shift")

            conn = sqlite3.connect(DB)
            c = conn.cursor()

            c.execute("SELECT COUNT(*) FROM farmers")
            farmers_count = c.fetchone()[0]

            # total milk litres & amount for date/shift
            query = "SELECT IFNULL(SUM(litres),0), IFNULL(SUM(amount),0) FROM milk_records WHERE rec_date=?"
            params = [rec_date]
            if shift:
                query += " AND shift=?"
                params.append(shift)
            c.execute(query, params)
            total_litres, total_amount = c.fetchone()

            c.execute("SELECT COUNT(*) FROM milk_records")
            total_records = c.fetchone()[0]

            conn.close()
            return json.dumps(
                {
                    "success": True,
                    "farmers_count": farmers_count,
                    "total_litres": total_litres,
                    "total_amount": total_amount,
                    "total_records": total_records,
                }
            )
        except Exception as e:
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # 🥛 FETCH MILK RECORDS (FIXED)
    # -------------------------------
    def fetch_records(self, data):
        try:
            payload = json.loads(data or "{}")
            rec_date = (payload.get("date") or "").strip()
            shift = (payload.get("shift") or "").strip()

            with lock:
                conn = sqlite3.connect(DB, timeout=10, check_same_thread=False)
                c = conn.cursor()

                sql = """
                    SELECT 
                        m.id,
                        m.rec_date,
                        m.farmer_code,
                        COALESCE(m.farmer_name, f.name) AS farmer_name,
                        COALESCE(m.category, f.category) AS category,
                        m.shift,
                        m.litres,
                        m.fat,
                        m.snf,
                        m.rate,
                        m.amount
                    FROM milk_records m
                    LEFT JOIN farmers f ON TRIM(m.farmer_code) = TRIM(f.code)
                    WHERE 1=1
                """

                params = []

                #  Match exact stored date text (don’t wrap in DATE())
                if rec_date:
                    sql += " AND m.rec_date = ?"
                    params.append(rec_date)

                #  Case-insensitive match for shift
                if shift:
                    sql += " AND LOWER(m.shift) = LOWER(?)"
                    params.append(shift)

                sql += " ORDER BY m.rec_date DESC, m.id DESC LIMIT 500"

                c.execute(sql, params)
                rows = c.fetchall()
                cols = [d[0] for d in c.description]
                records = [dict(zip(cols, r)) for r in rows]
                conn.close()

            print(f" fetch_records returned {len(records)} record(s)")
            return json.dumps({"success": True, "records": records})

        except Exception as e:
            print(" fetch_records error:", e)
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # 🧾 SAVE NEW MILK RECORD
    # -------------------------------
    def save_record(self, data):
        try:
            payload = json.loads(data)
            rec_date = payload.get("rec_date")
            farmer_code = payload.get("farmer_code")
            shift = payload.get("shift")
            litres = payload.get("litres")
            fat = payload.get("fat")
            snf = payload.get("snf")
            rate = payload.get("rate")
            amount = payload.get("amount")

            conn = sqlite3.connect(DB)
            c = conn.cursor()

            # fetch farmer details
            c.execute("SELECT name, category FROM farmers WHERE code=?", (farmer_code,))
            f = c.fetchone()
            if f:
                farmer_name, category = f
            else:
                farmer_name, category = ("Unknown", "Unknown")

            c.execute(
                """
                INSERT INTO milk_records
                (rec_date, farmer_code, farmer_name, category, shift, litres, fat, snf, rate, amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rec_date,
                    farmer_code,
                    farmer_name,
                    category,
                    shift,
                    litres,
                    fat,
                    snf,
                    rate,
                    amount,
                ),
            )
            conn.commit()
            conn.close()

            return json.dumps({"success": True, "message": "Record saved successfully"})
        except Exception as e:
            print(" save_record error:", e)
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # 👩‍🌾 FARMERS
    # -------------------------------
    def get_all_farmers(self, data=None):
        try:
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("SELECT id, code, name, category FROM farmers ORDER BY id ASC")
            farmers = query_dicts(c)
            conn.close()
            return json.dumps({"success": True, "farmers": farmers})
        except Exception as e:
            print(" get_all_farmers error:", e)
            return json.dumps({"success": False, "message": str(e)})

    def add_farmer(self, data):
        try:
            payload = json.loads(data)
            code = payload.get("code")
            name = payload.get("name")
            category = payload.get("category")

            if not (code and name and category):
                return json.dumps({"success": False, "message": "All fields required"})

            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute(
                "INSERT INTO farmers (code, name, category) VALUES (?, ?, ?)",
                (code, name, category),
            )
            conn.commit()
            conn.close()
            return json.dumps({"success": True, "message": "Farmer added"})
        except Exception as e:
            print(" add_farmer error:", e)
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # 💰 ADVANCES
    # -------------------------------
    def get_all_advances(self, data=None):
        try:
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("SELECT * FROM farmer_advances ORDER BY id DESC")
            advances = query_dicts(c)
            conn.close()
            return json.dumps({"success": True, "advances": advances})
        except Exception as e:
            print(" get_all_advances error:", e)
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # 🧾 SALES
    # -------------------------------
    def get_all_sales(self, data=None):
        try:
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("SELECT * FROM sales_records ORDER BY id DESC")
            sales = query_dicts(c)
            conn.close()
            return json.dumps({"success": True, "sales": sales})
        except Exception as e:
            print(" get_all_sales error:", e)
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # 🕒 SHIFT MANAGEMENT
    # -------------------------------
    def get_current_shift(self, data=None):
        try:
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute(
                "SELECT current_shift, current_date FROM shift_tracker WHERE id=1"
            )
            row = c.fetchone()
            conn.close()
            if row:
                return json.dumps({"success": True, "shift": row[0], "date": row[1]})
            return json.dumps({"success": False, "message": "Shift not found"})
        except Exception as e:
            return json.dumps({"success": False, "message": str(e)})

    def start_new_shift(self, data=None):
        try:
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("SELECT current_shift FROM shift_tracker WHERE id=1")
            cur = c.fetchone()[0]
            new_shift = "Evening" if cur == "Morning" else "Morning"
            c.execute(
                "UPDATE shift_tracker SET current_shift=?, current_date=date('now') WHERE id=1",
                (new_shift,),
            )
            conn.commit()
            conn.close()
            return json.dumps(
                {"success": True, "shift": new_shift, "message": "Shift changed"}
            )
        except Exception as e:
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # FILE SAVE (PDF/CSV)
    # -------------------------------
    def save_file(self, data):
        try:
            payload = json.loads(data)
            content = payload.get("content")
            filename = payload.get("filename")
            filetype = payload.get("filetype")

            # Decode base64
            if isinstance(content, str) and content.startswith("data:"):
                content = content.split(",")[1]
                content = base64.b64decode(content)
            else:
                content = content.encode("utf-8")

            root = tk.Tk()
            root.withdraw()
            ftypes = [("CSV files", "*.csv"), ("PDF files", "*.pdf")]
            default_ext = ".csv" if filetype == "csv" else ".pdf"
            path = filedialog.asksaveasfilename(
                title="Save Report",
                initialfile=filename,
                defaultextension=default_ext,
                filetypes=ftypes,
            )

            if not path:
                return json.dumps({"success": False, "message": "Cancelled"})

            with open(path, "wb") as f:
                f.write(content)

            print(f"✅ Saved file: {path}")
            return json.dumps({"success": True, "message": f"Saved to {path}"})
        except Exception as e:
            print(" save_file error:", e)
            return json.dumps({"success": False, "message": str(e)})


    def get_rates(self, data=None):
        """
        Fetch all rate entries (category, base, fat ₹/u, snf ₹/u)
        from the rate_table for use in calculations or display.
        """
        try:
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("""
                SELECT 
                    id,
                    category,
                    base,
                    fat_rate,
                    snf_rate
                FROM rate_table
                ORDER BY category
            """)
            rows = c.fetchall()
            cols = [d[0] for d in c.description]
            rates = [dict(zip(cols, r)) for r in rows]

            conn.close()
            return json.dumps({"success": True, "rates": rates})

        except Exception as e:
            print("get_rates error:", e)
            return json.dumps({"success": False, "message": str(e)})


# -------------------------------
# RUN APP
# -------------------------------
if __name__ == "__main__":
    if not os.path.exists(DB):
        print("Database not found. Please create it first.")
    api = Api()
    window = webview.create_window(
        "Varad Dairy",
        url="ui/index.html",
        js_api=api,
        width=1200,
        height=750,
        resizable=True,
    )
    webview.start(debug=False)
