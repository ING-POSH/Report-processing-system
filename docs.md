# Report Processing System - Complete Setup Guide

Welcome to the **Report Processing System**! This guide covers everything you need to get the system up and running, from initial environment setup to launching the frontend dashboard.

---

## 🏗️ Project Architecture

- **Backend**: Flask (Python) + SQLAlchemy (SQLite).
- **Frontend**: React (Vite) + Ant Design.
- **AI Features**: OpenAI Whisper (Transcription) & GPT-4o (Report Generation).
- **Multi-Tenancy**: Supports UN-Habitat Internal and Partner Project spaces.

---

## 📋 System Requirements

- **Python 3.8+**
- **Node.js 18+** & **npm**
- **Git**

---

## 🚀 Setup Instructions

You can set up the project automatically using the provided script or manually.

### Option A: Automatic Setup (Windows Only)
Run the PowerShell setup script to automate virtual environment creation, dependency installation, and directory setup:

1. Open PowerShell in the project root.
2. Run the script:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process; .\setup.ps1
   ```

### Option B: Manual Setup (All Platforms)
If the script fails or you prefer manual control, follow these steps:

#### 1. Backend Environment Setup
1. **Create Virtual Environment**:
   ```bash
   # Windows
   python -m venv venv
   # Linux/Mac
   python3 -m venv venv
   ```
2. **Activate Virtual Environment**:
   ```bash
   # Windows (PowerShell)
   .\venv\Scripts\Activate.ps1
   # Windows (CMD)
   .\venv\Scripts\activate.bat
   # Linux/Mac
   source venv/bin/activate
   ```
3. **Install Dependencies**:
   ```bash
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and add your keys:
   ```bash
   # Windows
   copy .env.example .env
   # Linux/Mac
   cp .env.example .env
   ```
   *Note: Open `.env` and add your `OPENAI_API_KEY` to enable AI transcription.*
5. **Create Required Directories**:
   Ensure these folders exist in the root: `uploads`, `processed`, `temp`, `logs`, `instance`.

---

## 🏃 How to Run the Project

You need to run **two separate terminals**: one for the Backend API and one for the Frontend UI.

### 1. Start the Backend (API)
1. Open a terminal in the root directory.
2. **Activate the venv** (see activation steps above).
3. Start the server:
   ```bash
   python app.py
   ```
   - The API will be live at `http://localhost:8080`.
   - The database (`report_bot.db`) is initialized automatically.

### 2. Start the Frontend (UI)
1. Open a **new** terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. **Install Node modules** (first time only):
   ```bash
   npm install
   ```
3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   - The UI will be available at `http://localhost:5173`.

---

## 🔑 Initial Setup Flow

1. **Signup**: Open the frontend URL, go to **Signup**, and create an organization.
2. **Admin Access**: The first user becomes the Organization Admin.
3. **Login**: Use your email and password to access the dashboard.
4. **Choose Space**: Select between **UN-Habitat Internal** (Field reports/Tasks) or **Partner Projects** (Risk/Engagement).

---

## 📡 Key API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | GET | Basic system health check. |
| `/api/auth/signup/organization` | POST | Register new org + admin. |
| `/api/reports` | POST | Upload field reports & stakeholder logs. |
| `/api/transcribe` | POST | Send audio for AI transcription. |

---

## 🛠️ Troubleshooting

- **Venv Not Activating**: On Windows, ensure you've run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in an admin PowerShell session.
- **Port 8080 Occupied**: Change the port in `.env` or run with: `$env:PORT=3000; python app.py`.
- **Database Reset**: Delete `report_bot.db` and restart `app.py` to start with a fresh database.
- **NPM Errors**: If `npm install` fails, try `npm install --legacy-peer-deps`.

---

**Happy Coding!** 🚀
