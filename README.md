# NeoBank

A digital banking platform with continuous behavioral authentication.
Built with React + Vite, Node.js/Express, MongoDB, JWT, and a Python ML microservice.

---

## Project Structure

```
NeoBank/
├── backend/                    ← Express + MongoDB + JWT
│   ├── config/db.js            ← MongoDB connection
│   ├── models/
│   │   ├── user.js             ← User schema
│   │   ├── transaction.js      ← Transaction schema
│   │   └── behaviorSample.js  ← Stores raw behavioral sessions for training
│   ├── controllers/
│   │   ├── userController.js       ← register, login, getMe
│   │   ├── transactionController.js ← getTransactions, transfer
│   │   └── behaviorController.js   ← ingestEvents, train, status, score
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── behaviorRoutes.js
│   ├── middlewares/auth.js     ← JWT guard middleware
│   ├── services/
│   │   ├── auth.js             ← generateToken, verifyToken
│   │   └── mlService.js        ← talks to Python ML microservice
│   ├── index.js                ← entry point
│   └── .env
│
├── ml/                         ← Python Flask ML microservice
│   ├── app.py                  ← Flask routes: /train, /score, /status
│   ├── features.py             ← extracts feature vector from raw events
│   ├── model.py                ← One-Class SVM: train + score
│   ├── trained_models/         ← saved model files per user (auto-created)
│   └── requirements.txt
│
└── frontend/                   ← React + Vite
    ├── src/
    │   ├── api/client.js       ← axios with JWT auto-attach
    │   ├── sdk/BehaviorSDK.js  ← keystroke/mouse/scroll/click collector
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── BehaviorContext.jsx
    │   ├── components/
    │   │   ├── DashboardLayout.jsx  ← sidebar + topbar + Outlet
    │   │   └── TrustBadge.jsx       ← live score in navbar
    │   └── pages/
    │       ├── Login.jsx / Register.jsx
    │       ├── Dashboard.jsx   ← balance, spending chart, recent tx
    │       ├── Transfer.jsx    ← send money (blocked if score < 50)
    │       ├── Transactions.jsx ← full history with search/filter
    │       ├── Cards.jsx       ← card management UI
    │       ├── Security.jsx    ← train ML model + live trust timeline
    │       └── Profile.jsx
    └── vite.config.js          ← proxies /api → Express :8000
```

---

## How to Run

### 1. Backend (Express + MongoDB)
```bash
cd backend
npm install
# Make sure MongoDB is running on localhost:27017
npm run dev        # nodemon index.js on :8000
```

### 2. ML Service (Python)
```bash
cd ml
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py               # Flask on :5001
```

### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev                 # Vite on :3000, /api proxied to :8000
```

---

## The ML Flow (no fake data)

1. User registers and uses the app — SDK silently records behavioral events
2. Every 8s, events flush to `POST /api/behavior/events` → stored in MongoDB
3. On the Security page, once 3+ sessions are collected, user clicks **Train Now**
4. Backend sends all stored sessions to Python `/train` → One-Class SVM is fitted
5. Model saved to `ml/trained_models/<userId>.joblib`
6. Future event batches are scored → trust score 0–100 returned to React
7. TrustBadge in topbar updates live. Transfers blocked if score < 50.

---

## API Routes

| Method | Path                          | Auth | Description                  |
|--------|-------------------------------|------|------------------------------|
| POST   | /api/auth/register            | —    | Create account                |
| POST   | /api/auth/login               | —    | Login, get JWT                |
| GET    | /api/auth/me                  | JWT  | Current user info             |
| GET    | /api/transactions             | JWT  | Transaction history           |
| POST   | /api/transactions/transfer    | JWT  | Send money                    |
| POST   | /api/behavior/events          | JWT  | Ingest behavioral events      |
| POST   | /api/behavior/train           | JWT  | Train ML model                |
| GET    | /api/behavior/status          | JWT  | Sessions collected + trained? |
| GET    | /api/behavior/score           | JWT  | Latest trust score            |
