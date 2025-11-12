"""
run_dairy.py
------------
Smart launcher for Shree Ganesh Dairy Management System.

This script ensures:
1. The database is present (auto-creates it if missing)
2. Then launches the main Dairy Management software (desktop app)
"""

import os
import subprocess
import sys
import time

DB_FILE = "database.db"
CREATE_DB_SCRIPT = "create_db.py"
MAIN_APP_SCRIPT = "main.py"


def run_command(script):
    """Helper to run another Python script."""
    print(f"➡️  Running {script} ...")
    result = subprocess.run([sys.executable, script])
    if result.returncode != 0:
        print(f"❌ Error running {script}. Exiting.")
        sys.exit(1)


def main():
    print("🐄 Shree Ganesh Dairy Management System")
    print("---------------------------------------")

    # Step 1: Check if database exists
    if not os.path.exists(DB_FILE):
        print("⚙️ Database not found. Creating new database...")
        run_command(CREATE_DB_SCRIPT)
        time.sleep(1)
        print("✅ Database created successfully.\n")

    else:
        print("📦 Database found. Skipping creation.\n")

    # Step 2: Launch main application
    print("🚀 Starting Dairy Management Software...\n")
    run_command(MAIN_APP_SCRIPT)


if __name__ == "__main__":
    main()
