# 🌍 Trip-Genie — Smart Tourism Ecosystem

A premium full-stack travel platform built with **React + Vite** (frontend) and **Node.js + Express + MongoDB** (backend). Trip Genie helps travelers discover and book unique stays hosted by verified locals, with smart group matching, live weather monitoring, and emergency risk management.

---

## ✨ Features

### 👤 Traveler
- **Smart Authentication** — Register/Login with JWT. Session persists across browser refreshes.
- **KYC Verification** — One-time profile + Aadhaar upload. Never asked again after first submission.
- **Discover & Book** — Search places by location. View host properties with photos, ratings & slot availability.
- **3-Member Group Chat** — When 3 travelers book the same property, a shared group chat is auto-created.
- **Group Discount** — All 3 members accept → Host confirms → **10% off** applied automatically.
- **Transport Planner** — Shows distance, flight/train/cab duration & cost from your city to the destination.
- **Live Weather** — Real-time weather check for the destination with "Safe / Not Safe to Travel" flag.
- **Food Menu** — Select meals from host's menu after booking confirmation.
- **Must-Visit Guide** — Host-curated list of nearby attractions.
- **Emergency SOS** — One-tap alert sends an emergency message to the host.
- **Booking History** — View all confirmed bookings with Booking ID, schedule, and price breakdown.

### 🏠 Host
- **Property Listing** — Upload property with photos, price, location, and available slots.
- **Food Menu Management** — Add/remove food items with categories and prices.
- **Must-Visit Guide** — Curate a local attraction list for guests.
- **Inbox** — View all traveler inquiries (single & group), confirm bookings, apply group discounts.
- **Emergency Dashboard** — Real-time alerts when a traveler sends an SOS.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Framer Motion, Lucide React |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| Styling | Vanilla CSS (Glassmorphism, Dark Mode) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) (local) **or** a MongoDB Atlas connection string

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/trip-genie.git
cd trip-genie
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Install backend dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Configure environment (optional — for MongoDB Atlas)
Create `backend/.env`:
```env
MONGO_URI=mongodb+srv://your-atlas-uri
JWT_SECRET=your_super_secret_key
PORT=5000
```

### 5. Start both servers

**Backend** (in one terminal):
```bash
cd backend
node server.js
```

**Frontend** (in another terminal):
```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
trip/
├── src/
│   ├── App.jsx            # Root app + auth + session restore
│   ├── api.js             # All API calls with timeout/offline fallback
│   ├── components.jsx     # Shared UI (Sidebar, ChatModal, FileUpload…)
│   ├── HostDashboard.jsx  # Host portal (upload, food, inbox, emergency)
│   ├── UserDashboard.jsx  # Traveler portal (KYC, book, group chat, SOS)
│   ├── index.css          # Full design system (glassmorphism, dark mode)
│   └── App.css
├── backend/
│   ├── server.js          # Express + MongoDB + Socket.IO API
│   └── package.json
├── index.html
├── vite.config.js
├── package.json
└── .gitignore
```

---

## 🌐 Offline Mode
The app works **without MongoDB** using localStorage fallback for authentication and data persistence. Once MongoDB is connected, all data is stored in the database.

---

## 📸 Screenshots

> Coming soon

---

## 📄 License

MIT License © 2025 Trip Genie
