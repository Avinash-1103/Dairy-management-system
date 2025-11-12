# ============================================================
# 🐄 Shree Ganesh Dairy Management System
# Project Metadata and Setup Information (v1.0)
# ============================================================

project:
  name: "Shree Ganesh Dairy Management System"
  type: "Desktop Application"
  description: >
    A complete offline dairy management software built with Python, HTML, CSS, and JavaScript.
    It allows dairy owners to manage milk collection, farmer payments, advances, rate settings,
    and daily sales in a modern desktop interface using PyWebView and SQLite database.
  developer: "Harshad Nalawade"
  license: "MIT"
  version: "1.0.0"
  icon: "logo.ico"
  ui_framework: "PyWebView (Chromium Embedded)"
  executable_name: "ShreeGaneshDairy.exe"

# ------------------------------------------------------------
# 🧠 TECHNOLOGY STACK
# ------------------------------------------------------------
tech_stack:
  frontend: 
    - HTML5
    - CSS3
    - JavaScript (Vanilla)
  backend:
    - Python (Bottle Framework / PyWebView)
  database: "SQLite3"
  packaging_tool: "PyInstaller"
  runtime: "Python 3.12+"

# ------------------------------------------------------------
# 📂 PROJECT STRUCTURE
# ------------------------------------------------------------
structure:
  root:
    - main.py
    - database.db
    - requirements.txt
    - README.md
    - project-info.yml
    - .gitignore
  directories:
    ui:
      - index.html
      - dashboard.html
      - dashboard.css
      - dashboard.js
    dist:
      - (auto-generated EXE builds)
    build:
      - (temporary PyInstaller files)

# ------------------------------------------------------------
# 🧾 DATABASE INFORMATION
# ------------------------------------------------------------
database:
  file_name: "database.db"
  engine: "SQLite3"
  auto_create_on_first_run: true
  tables:
    - name: "users"
      description: "Stores system login credentials"
      columns: ["id", "username", "password"]
    - name: "farmers"
      description: "Farmer master data (name, code, category)"
      columns: ["id", "code", "name", "category"]
    - name: "milk_records"
      description: "Milk collection records per farmer"
      columns: ["id", "rec_date", "farmer_code", "farmer_name", "category", "shift", "litres", "fat", "snf", "rate", "amount", "created_at"]
    - name: "farmer_advances"
      description: "Advance payments or loans to farmers"
      columns: ["id", "farmer_code", "date", "amount", "remarks"]
    - name: "sales_records"
      description: "Customer sales transactions"
      columns: ["id", "sale_date", "customer", "litres", "rate", "amount"]
    - name: "rate_table"
      description: "Base rates and Fat/SNF pricing"
      columns: ["id", "category", "base", "fat_rate", "snf_rate"]
    - name: "shift_tracker"
      description: "Tracks current shift (Morning/Evening)"
      columns: ["id", "current_shift", "current_date"]

# ------------------------------------------------------------
# 🔒 DEFAULT LOGIN DETAILS
# ------------------------------------------------------------
login:
  default_user:
    username: "admin"
    password: "admin123"
  note: "Change password directly in the database after first use for security."

# ------------------------------------------------------------
# 🖥️ HOW TO RUN (DEV MODE)
# ------------------------------------------------------------
run_instructions:
  steps:
    - "1. Clone the repository:"
    - "   git clone https://github.com/<your-username>/<repo-name>.git"
    - "   cd dairy-management-system"
    - "2. (Optional) Create virtual environment:"
    - "   python -m venv venv"
    - "   venv\\Scripts\\activate"
    - "3. Install dependencies:"
    - "   pip install -r requirements.txt"
    - "4. Run the application:"
    - "   python main.py"
  launch_type: "Desktop window via PyWebView (not browser tab)"
  dependencies:
    - "Python >= 3.12"
    - "PyWebView"
    - "Bottle"
    - "Tkinter (for file save dialog)"
  runs_offline: true

# ------------------------------------------------------------
# ⚙️ BUILD EXE (CLIENT DISTRIBUTION)
# ------------------------------------------------------------
build_exe:
  command: >
    pyinstaller --noconsole --onefile --icon=logo.ico 
    --add-data "ui;ui" 
    --add-data "database.db;." 
    main.py
  output_directory: "dist/"
  include_files:
    - ui/
    - database.db
  description: >
    The build command packages everything into a single EXE file using PyInstaller.
    Keep the UI folder and database file next to the EXE for proper execution.

# ------------------------------------------------------------
# 💡 FEATURES
# ------------------------------------------------------------
features:
  - "Milk record entry with automatic rate calculation"
  - "Farmer management with editable records"
  - "Advance tracking per farmer"
  - "Sales records and total sales summary"
  - "Shift-wise record management (Morning/Evening)"
  - "Dark and Light theme modes"
  - "Automatic database creation if missing"
  - "Secure login system with default credentials"
  - "CSV/PDF export of reports"
  - "Offline, lightweight, no external dependencies"

# ------------------------------------------------------------
# 📊 DASHBOARD SECTIONS
# ------------------------------------------------------------
dashboard:
  sections:
    - "Milk Records"
    - "Farmer Advances"
    - "Sales Records"
    - "Summary Cards (Total Farmers, Milk, Amount)"
    - "Reports & Billing Section"

# ------------------------------------------------------------
# 💾 BACKUP NOTES
# ------------------------------------------------------------
backup:
  recommendation: >
    Backup the 'database.db' file periodically.
    Copy the entire project folder for full backup.
  restore:
    - "To restore, replace the database.db file with your backup version."

# ------------------------------------------------------------
# 📦 DISTRIBUTION PACKAGE CONTENTS
# ------------------------------------------------------------
distribution:
  must_include:
    - "main.exe"
    - "database.db (with default data)"
    - "ui/ folder (HTML, CSS, JS)"
    - "logo.ico"
  optional:
    - "README.md"
    - "project-info.yml"

# ------------------------------------------------------------
# 🧾 VERSION HISTORY
# ------------------------------------------------------------
version_history:
  - version: "1.0.0"
    date: "2025-11-13"
    changes:
      - "Initial release with login, dashboard, shifts, farmers, sales, and dark mode."
      - "Integrated EXE packaging via PyInstaller."
      - "Auto-database creation with default admin credentials."

# ------------------------------------------------------------
# 🧍 AUTHOR INFORMATION
# ------------------------------------------------------------
author:
  name: "Harshad Nalawade"
  github: "https://github.com/HarshadNalawade"
  email: "your-email@example.com"
  country: "India"
  license: "MIT"
  quote: "A modern approach to traditional dairy management 🐄"
