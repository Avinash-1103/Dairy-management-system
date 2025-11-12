# 🐄 Shree Ganesh Dairy Management System

## Project Metadata and Setup Information (v1.0.0)

A complete offline dairy management software built with **Python**, **HTML**, **CSS**, and **JavaScript**. It allows dairy owners to manage milk collection, farmer payments, advances, rate settings, and daily sales in a modern desktop interface using PyWebView and SQLite.

---

### Project Details

| Metadata | Detail |
| :--- | :--- |
| **Project Name** | Shree Ganesh Dairy Management System |
| **Type** | Desktop Application |
| **Developer** | Harshad Nalawade |
| **License** | MIT |
| **Version** | 1.0.0 |
| **UI Framework** | PyWebView (Chromium Embedded) |
| **Executable Name** | ShreeGaneshDairy.exe |

---

## 🧠 Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Python (Bottle Framework / PyWebView) |
| **Database** | SQLite3 |
| **Packaging Tool** | PyInstaller |
| **Runtime** | Python 3.12+ |

---

## 💡 Features

* **Core Management:** Milk record entry with automatic rate calculation.
* **Farmer Management:** Editable farmer records and advance tracking per farmer.
* **Reporting:** Sales records, total sales summary, and CSV/PDF export of reports.
* **Operational:** Shift-wise record management (Morning/Evening).
* **User Interface:** Dark and Light theme modes.
* **System:** Secure login system with default credentials, automatic database creation if missing.
* **Deployment:** Offline, lightweight, no external dependencies.

---

## 🧾 Database Information (SQLite3)

The database file is named **`database.db`** and is set to auto-create on the first run.

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `users` | Stores system login credentials | id, username, password |
| `farmers` | Farmer master data | id, code, name, category |
| `milk_records` | Milk collection records per farmer | rec_date, farmer_code, shift, litres, fat, snf, rate, amount |
| `farmer_advances` | Advance payments or loans to farmers | farmer_code, date, amount, remarks |
| `sales_records` | Customer sales transactions | sale_date, customer, litres, rate, amount |
| `rate_table` | Base rates and Fat/SNF pricing | category, base, fat_rate, snf_rate |
| `shift_tracker` | Tracks current shift | current_shift, current_date |

### Default Login Details 🔒

> **Username:** `admin`
> **Password:** `admin123`
> **Note:** Change password directly in the database after first use for security.

---

## 🖥️ How to Run (Development Mode)

**Dependencies:** Python $\ge 3.12$, PyWebView, Bottle, and Tkinter. The application runs offline in a desktop window.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/](https://github.com/)<your-username>/<repo-name>.git
    cd dairy-management-system
    ```
2.  **(Optional) Create and activate virtual environment:**
    ```bash
    python -m venv venv
    venv\Scripts\activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the application:**
    ```bash
    python main.py
    ```

---

## ⚙️ Build EXE (Client Distribution)

The PyInstaller command packages the application into a single EXE file.

* **Build Command:**
    ```bash
    pyinstaller --noconsole --onefile --icon=logo.ico --add-data "ui;ui" --add-data "database.db;." main.py
    ```
* **Output Directory:** `dist/`
* **Distribution Package Must Include:**
    * `main.exe`
    * `database.db` (with default data)
    * `ui/` folder (HTML, CSS, JS)
    * `logo.ico`

---

## 📁 Project Structure

## 📁 Project Structure

. ├── main.py ├── database.db ├── requirements.txt ├── README.md ├── project-info.yml ├── .gitignore ├── ui/ │ ├── index.html │ ├── dashboard.html │ ├── dashboard.css │ └── dashboard.js ├── dist/ (auto-generated EXE builds) └── build/ (temporary PyInstaller files)

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

## 🧍 Author Information

* **Name:** Harshad Nalawade
* **GitHub:** https://github.com/HarshadNalawade
* **License:** MIT
* **Quote:** "A modern approach to traditional dairy management 🐄"
