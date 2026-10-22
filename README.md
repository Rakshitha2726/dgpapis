# Digital Governance Performance Assessment and Policy Intelligence System (DGPAPIS)

A web-based platform for assessing government department performance using predefined KPIs across multiple roles.

---

## 🏗️ Project Structure

```
dgpapis/
├── frontend/               # React + Vite frontend application
│   ├── public/             # Static assets served as-is
│   ├── src/
│   │   ├── assets/         # Images, icons, fonts
│   │   ├── components/     # Reusable UI components (shared across pages)
│   │   ├── context/        # React Context providers (auth, theme, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page-level components (one per route)
│   │   ├── services/       # API call functions (axios wrappers)
│   │   ├── styles/         # Global CSS and design tokens
│   │   └── utils/          # Frontend utility/helper functions
│   ├── .env                # Frontend environment variables (API base URL, etc.)
│   ├── index.html          # Vite HTML entry point
│   ├── package.json
│   └── vite.config.js
│
├── backend/                # Node.js + Express REST API server
│   ├── src/
│   │   ├── config/         # Database connection and app configuration
│   │   ├── controllers/    # Route handler logic (business logic)
│   │   ├── middleware/      # Express middleware (error handler, logger, etc.)
│   │   ├── models/         # Sequelize ORM models (database schema)
│   │   ├── routes/         # Express route definitions
│   │   ├── utils/          # Backend utility/helper functions
│   │   └── validators/     # Request validation schemas (Joi)
│   ├── .env                # Backend environment variables (DB creds, JWT secret)
│   ├── .env.example        # Template for environment variables
│   ├── package.json
│   └── server.js           # Express app entry point
│
├── .gitignore              # Root-level gitignore
└── README.md               # This file
```

---

## 👥 User Roles

| Role | Description |
|------|-------------|
| **Admin** | Manages users, departments, and KPIs |
| **Department Officer** | Enters performance data for their department |
| **Senior Officer / Policymaker** | Views reports, comparisons, trends, and insights |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Axios, React Router v6 |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Sequelize |
| Validation | Joi |
| Environment | dotenv |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL 14+
- npm v9+

### 1. Clone / Open the Project

```bash
cd dgpapis
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Copy the environment template and fill in your values:

```bash
copy .env.example .env
```

Edit `backend/.env`:
```
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dgpapis_db
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
```

Start the backend dev server:
```bash
npm run dev
```

The API will be available at: `http://localhost:5000`

### 3. Set Up the Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
```

Edit `frontend/.env` if needed (default API URL is already set):
```
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the frontend dev server:
```bash
npm run dev
```

The app will be available at: `http://localhost:5173`

---

## 📋 Development Milestones

- [x] **Stage 1** – Project structure & configuration *(current)*
- [ ] **Stage 2** – Authentication & role-based access
- [ ] **Stage 3** – Department management
- [ ] **Stage 4** – KPI management
- [ ] **Stage 5** – Performance data entry
- [ ] **Stage 6** – Score calculation engine
- [ ] **Stage 7** – Dashboards & charts
- [ ] **Stage 8** – Department comparison & reports

---

## 🗄️ Database Setup

Create the PostgreSQL database before starting the backend:

```sql
CREATE DATABASE dgpapis_db;
```

The application will auto-sync models to the database when `NODE_ENV=development` (via Sequelize `sync`).

---

## 📁 Key Configuration Files

| File | Purpose |
|------|---------|
| `backend/.env` | Database credentials, port, JWT secret, node env |
| `backend/.env.example` | Safe template to commit to version control |
| `frontend/.env` | API base URL for frontend |
| `backend/src/config/database.js` | Sequelize instance and DB connection |
| `backend/src/config/app.js` | Express app setup and middleware registration |
| `vite.config.js` | Vite build and dev server configuration |
