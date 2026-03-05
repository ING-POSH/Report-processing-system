# Report Processing System - Quick Start Guide

## Getting Started in 5 Minutes

This guide will help you get the Report Processing System up and running quickly.

---

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git (optional, for version control)

---

## Step 1: Install Dependencies

Open a terminal in the project directory and run:

```bash
pip install -r requirements.txt
```

**Note**: If you encounter any issues with PyPDF2 or pdfplumber, you can skip them - they're optional for PDF processing.

---

## Step 2: Setup Environment

Create a `.env` file from the example:

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

**Linux/Mac:**
```bash
cp .env.example .env
```

Edit the `.env` file and update the following variables:
- `SECRET_KEY`: Generate a random secret key
- `JWT_SECRET_KEY`: Generate a random JWT secret
- `DATABASE_URL`: Keep as SQLite for development (already configured)

---

## Step 3: Initialize Database

The database will be automatically created when you first run the application. No manual setup required!

---

## Step 4: Run the Application

Start the Flask development server:

```bash
python app.py
```

You should see output like:
```
INFO: Starting Report Processing System on port 8080
 * Running on http://0.0.0.0:8080
```

---

## Step 5: Test the System

### Health Check
Open your browser or use curl:

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-03T20:19:52.123456"
}
```

### Create Your First Organization

Use this curl command (update with your details):

```bash
curl -X POST http://localhost:8080/api/auth/signup/organization \
  -H "Content-Type: application/json" \
  -d '{
    "organization_name": "My Test Org",
    "admin_email": "admin@example.com",
    "admin_password": "SecurePassword123!",
    "admin_name": "Admin User"
  }'
```

Expected response:
```json
{
  "message": "Organization created successfully",
  "organization": { ... },
  "user": { ... },
  "access_token": "eyJ..."
}
```

**Save the access_token** - you'll need it for authenticated requests!

---

## Step 6: Explore the API

### List Your Workspaces

```bash
curl http://localhost:8080/api/workspaces \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Organization Details

```bash
curl http://localhost:8080/api/organizations/YOUR_ORG_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Organization Members

```bash
curl http://localhost:8080/api/organizations/YOUR_ORG_ID/members \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Common Tasks

### Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

### Invite a Team Member

```bash
curl -X POST http://localhost:8080/api/organizations/YOUR_ORG_ID/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "teammate@example.com",
    "role": "member"
  }'
```

### Create a New Workspace

```bash
curl -X POST http://localhost:8080/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "organization_id": "YOUR_ORG_ID",
    "name": "Project Alpha",
    "description": "Workspace for Project Alpha documents"
  }'
```

---

## Troubleshooting

### Port Already in Use

If port 8080 is already in use, set a different port:

```bash
# Windows PowerShell
$env:PORT=3000; python app.py

# Linux/Mac
PORT=3000 python app.py
```

### Database Errors

If you encounter database errors, delete the existing database and restart:

```bash
# Windows PowerShell
Remove-Item instance\report_bot.db

# Linux/Mac
rm instance/report_bot.db

# Then restart the app
python app.py
```

### Module Not Found Errors

If you see "ModuleNotFoundError", reinstall dependencies:

```bash
pip install --upgrade -r requirements.txt
```

### CORS Issues (Browser)

If testing from a browser and getting CORS errors:
- The API runs on `http://localhost:8080`
- Make sure your frontend is also on localhost (different port is OK)
- CORS is enabled by default in development mode

---

## Next Steps

### 1. Read the Documentation
- [TEAM_MANAGEMENT_OVERVIEW.md](TEAM_MANAGEMENT_OVERVIEW.md) - Features overview
- [TEAM_MANAGEMENT_SPEC.md](TEAM_MANAGEMENT_SPEC.md) - Technical specs
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Docker deployment guide

### 2. Build the Frontend
Create a React/Vue.js frontend to interact with the API:
```bash
cd frontend
npm init
# Install Vue 3 or React
npm install vue@next
```

### 3. Add Document Processing
Implement the document processing module:
- See `document_processor.py` for reference
- Integrate with the main app

### 4. Deploy with Docker
When ready for production:
```bash
docker-compose up -d
```

---

## Development Tips

### Use Postman or Insomnia
Import the API endpoints into Postman/Insomnia for easier testing.

### Enable Debug Mode
Set `DEBUG=True` in `.env` for detailed error messages during development.

### Database Viewer
Use [DB Browser for SQLite](https://sqlitebrowser.org/) to inspect the database.

### Logging
Check `logs/` directory for application logs.

---

## Support

For questions or issues:
1. Check the documentation files
2. Review the code comments in `app.py`
3. Check the logs for error messages

---

## What's Next?

Now that you have the system running:

✅ **Test organizational signup** - Create multiple organizations  
✅ **Invite team members** - Test the invitation flow  
✅ **Create workspaces** - Set up multiple team workspaces  
✅ **Test permissions** - Verify role-based access control  
✅ **Build the UI** - Create a frontend dashboard  
✅ **Add document processing** - Integrate the processing engine  

Happy coding! 🚀