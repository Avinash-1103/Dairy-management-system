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

# APP_NAME = "Varad_Dairy"

# #  Folder for user data (this is where real DB will live)
# user_data_dir = os.path.join(os.path.expanduser("~"), "Documents", APP_NAME)
# os.makedirs(user_data_dir, exist_ok=True)

# #  Actual working database path
# DB = os.path.join(user_data_dir, "database.db")

# #  Determine where the bundled database.db is located
# if getattr(sys, "frozen", False):
#     # Running from .exe — PyInstaller unpacks here
#     base_path = sys._MEIPASS
# else:
#     # Running directly from source
#     base_path = os.path.dirname(os.path.abspath(__file__))

# #  Path to default database (the one inside your source or packaged folder)
# src_db = os.path.join(base_path, "database.db")

# #  Copy starter DB only if missing
# if not os.path.exists(DB):
#     try:
#         if os.path.exists(src_db):
#             print(f"Copying starter database to {DB}")
#             shutil.copy(src_db, DB)
#         else:
#             print("Starter database not found. Creating blank one...")
#             open(DB, "w").close()
#     except Exception as e:
#         print(" Error copying database:", e)

DB = "database.db"

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
    # 📄 GENERATE DAILY / RANGE REPORT
    # -------------------------------
    def generate_report(self, data):
        try:
            payload = json.loads(data)
            from_date = payload.get("from_date")
            to_date = payload.get("to_date")
            shift = payload.get("shift")

            conn = sqlite3.connect(DB)
            c = conn.cursor()

            sql = """
                SELECT 
                    rec_date,
                    farmer_code,
                    farmer_name,
                    category,
                    shift,
                    litres,
                    fat,
                    snf,
                    rate,
                    amount
                FROM milk_records
                WHERE rec_date BETWEEN ? AND ?
            """
            params = [from_date, to_date]

            if shift and shift.lower() != "all":
                sql += " AND LOWER(shift) = LOWER(?)"
                params.append(shift)

            sql += " ORDER BY rec_date ASC, id ASC"

            c.execute(sql, params)
            rows = query_dicts(c)

            conn.close()
            return json.dumps({"success": True, "records": rows})

        except Exception as e:
            print("generate_report error:", e)
            return json.dumps({"success": False, "message": "Backend error"})


    def get_individual_bill(self, data):
        try:
            payload = json.loads(data)
            code = payload.get("code")
            start_date = payload.get("start_date")
            end_date = payload.get("end_date")

            conn = sqlite3.connect(DB)
            c = conn.cursor()

            c.execute("""
                SELECT rec_date, shift, litres, fat, snf, rate, amount
                FROM milk_records
                WHERE farmer_code=? AND rec_date BETWEEN ? AND ?
                ORDER BY rec_date ASC
            """, (code, start_date, end_date))
            records = query_dicts(c)

            c.execute("SELECT IFNULL(SUM(litres),0), IFNULL(SUM(amount),0) FROM milk_records WHERE farmer_code=? AND rec_date BETWEEN ? AND ?", (code, start_date, end_date))
            total_litres, total_amount = c.fetchone()

            c.execute("SELECT IFNULL(SUM(amount),0) FROM farmer_advances WHERE farmer_code=? AND date BETWEEN ? AND ?", (code, start_date, end_date))
            total_advance = c.fetchone()[0]

            conn.close()

            return json.dumps({
                "success": True,
                "data": {
                    "records": records,
                    "total_litres": total_litres,
                    "total_amount": total_amount,
                    "total_advance": total_advance,
                    "net": total_amount - total_advance
                }
            })

        except Exception as e:
            print("get_individual_bill error:", e)
            return json.dumps({"success": False, "message": str(e)})



    # -------------------------------
    # 📊 REPORT SUMMARY (Milk + Sales + Advances)
    # -------------------------------
    def get_reports_summary(self, data):
        """Get overall summary for given date range"""
        try:
            payload = json.loads(data or "{}")
            start_date = payload.get("start_date")
            end_date = payload.get("end_date")

            with lock:
                conn = sqlite3.connect(DB, timeout=10, check_same_thread=False)
                c = conn.cursor()

                # 🥛 Milk Summary
                c.execute("""
                    SELECT IFNULL(SUM(litres),0), IFNULL(SUM(amount),0)
                    FROM milk_records
                    WHERE rec_date BETWEEN ? AND ?
                """, (start_date, end_date))
                milk_litres, milk_amount = c.fetchone()

                # 💵 Sales Summary
                c.execute("""
                    SELECT IFNULL(SUM(litres),0), IFNULL(SUM(amount),0)
                    FROM sales_records
                    WHERE sale_date BETWEEN ? AND ?
                """, (start_date, end_date))
                sale_litres, sale_amount = c.fetchone()

                # 💰 Advances
                c.execute("""
                    SELECT IFNULL(SUM(amount),0)
                    FROM farmer_advances
                    WHERE date BETWEEN ? AND ?
                """, (start_date, end_date))
                total_advances = c.fetchone()[0]

                conn.close()

            net_income = (milk_amount + sale_amount) - total_advances

            return json.dumps({
                "success": True,
                "milk_litres": milk_litres,
                "milk_amount": milk_amount,
                "sale_litres": sale_litres,
                "sale_amount": sale_amount,
                "total_advances": total_advances,
                "net_income": net_income,
            })

        except Exception as e:
            print("❌ get_reports_summary error:", e)
            return json.dumps({"success": False, "message": str(e)})

    # -------------------------------
    # 💰 GENERATE WEEKLY / MONTHLY BILL
    # -------------------------------
    def generate_bill(self, data):
        try:
            payload = json.loads(data)
            start_date = payload.get("start_date")
            end_date = payload.get("end_date")
            bill_type = payload.get("bill_type")  # weekly or monthly

            conn = sqlite3.connect(DB)
            c = conn.cursor()

            c.execute("SELECT code, name, category FROM farmers ORDER BY id ASC")
            farmers = c.fetchall()

            bills = []

            for code, name, category in farmers:

                # Milk summary
                c.execute(
                    """
                    SELECT IFNULL(SUM(litres),0), IFNULL(SUM(amount),0)
                    FROM milk_records
                    WHERE farmer_code=? AND rec_date BETWEEN ? AND ?
                """,
                    (code, start_date, end_date),
                )
                litres, amount = c.fetchone()

                # Advances
                c.execute(
                    """
                    SELECT IFNULL(SUM(amount),0)
                    FROM farmer_advances
                    WHERE farmer_code=? AND date BETWEEN ? AND ?
                """,
                    (code, start_date, end_date),
                )
                advance = c.fetchone()[0]

                net = amount - advance

                bills.append(
                    {
                        "code": code,
                        "name": name,
                        "category": category,
                        "litres": litres,
                        "amount": amount,
                        "advance": advance,
                        "net": net,
                    }
                )

            conn.close()

            return json.dumps({"success": True, "bills": bills, "bill_type": bill_type})

        except Exception as e:
            print("generate_bill error:", e)
            return json.dumps({"success": False, "message": "Backend error"})

    # ===============================
    # 📄 EXPORT REPORT AS PDF (Base64 HTML)
    # ===============================
    def export_report_pdf(self, data):
        """
        Accepts raw HTML content + returns it so frontend can trigger print window.
        Mainly used as a bridge for consistent architecture.
        """
        try:
            payload = json.loads(data or "{}")
            html_content = payload.get("content")

            if not html_content:
                return json.dumps({"success": False, "message": "No content provided"})

            return json.dumps({"success": True, "html": html_content})

        except Exception as e:
            print("export_report_pdf error:", e)
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
            fat = float(payload.get("fat") or 0)
            snf = float(payload.get("snf") or 0)
            rate = payload.get("rate")
            amount = payload.get("amount")

            # --------------------------
            # 🧪 VALIDATION
            # --------------------------
            if not (2.0 <= fat <= 8.0):
                return json.dumps({
                    "success": False,
                    "message": "Invalid FAT value! FAT must be between 2.0 and 8.0"
                })

            if not (7.0 <= snf <= 9.5):
                return json.dumps({
                    "success": False,
                    "message": "Invalid SNF value! SNF must be between 7.0 and 9.5"
                })

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
