# CAMPUS-CONNECT

A modern, full-stack campus event discovery and registration platform designed for universities, student clubs, hackathons, and workshops.

---

## 🚀 Key Features

* **Event Catalog & Campus Pulse**: Browse scheduled workshops, AI hackathons, robotics build nights, and open-source jams with real-time seat availability gauges and activity spark metrics.
* **Instant Category Filtering & Search**: Filter instantly across AI, Robotics, Open Source, Design, and Web3 categories with responsive search.
* **Event Details & Interactive RSVP**: Detailed workshop outlines, schedules, venues, perk breakdown (free dinner, official certificates, compute credits), and real-time seat reservation.
* **5-Layer Production Safety Guards**:
  1. Authenticated User Validation (`x-user-id` header).
  2. Event Existence & Open Status Check.
  3. Duplicate Registration Guard (prevents double bookings with `409 Conflict`).
  4. Seat Capacity & Overbooking Guard (strict threshold checking).
  5. Supabase Database Persistence.
* **My Registrations Dashboard**: Dedicated dashboard displaying upcoming and past registrations.
* **Interactive QR Code Ticket Pass**: Generates digital event credentials with scannable QR code visual and download option.
* **Real Google / Apple Calendar Sync**: Direct one-click download of `.ics` calendar events.
* **RSVP Cancellation**: Seamlessly cancel an RSVP to immediately release the seat back to other students.

---

## 🛠️ Architecture & Tech Stack

* **Backend**: FastAPI (Python 3.12+), Uvicorn ASGI server, Pydantic v2 schemas.
* **Database**: Supabase PostgreSQL (`events`, `registrations`, `users`).
* **Frontend**: Vanilla JavaScript SPA (Inter typography, Material Symbols Outlined, Tailwind CSS design system).
* **Styling**: Campus Pulse design system with frosted glassmorphism, fluid micro-interactions, responsive mobile drawer, and ambient glow accents.

---

## 🏁 Quickstart

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables in backend/.env:
# SUPABASE_URL=https://<your-project>.supabase.co
# SUPABASE_KEY=<your-service-or-anon-key>

# Run backend dev server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend starts at `http://127.0.0.1:8000`:
* **App URL**: `http://127.0.0.1:8000/app/#/events`
* **Swagger API Docs**: `http://127.0.0.1:8000/docs`
* **Health Check**: `http://127.0.0.1:8000/health`

### 2. Frontend Usage

The frontend is served directly by FastAPI under `/app/`, or can be run with any static server. It automatically connects to the backend API at `http://127.0.0.1:8000/api`.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health check |
| `GET` | `/api/events` | List all campus events with search filter |
| `GET` | `/api/events/{id}` | Single event details with live capacity |
| `POST` | `/api/registrations` | Register student for an event (5 production guards) |
| `GET` | `/api/me/registrations` | Get current student's active registrations |
| `DELETE` | `/api/registrations/{id}` | Cancel registration and restore event capacity |
| `GET` | `/api/events/{id}/registrations` | Organizer attendee view |

---

## 📄 License

MIT License. Built for university campus communities.
