# Online Examination Portal

A MERN stack web-based examination portal with fullscreen enforcement for exam integrity assessment.

## 🚀 Features

- **User Roles**: Admin (Exam Coordinator) and Student
- **Admin Dashboard**: Create and manage exams
- **Student Dashboard**: View and take available exams
- **Fullscreen Enforcement**: Automatic fullscreen mode with violation tracking
- **MCQ Exams**: Multiple choice question support with timer

## 🛠️ Tech Stack

- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Styling**: Vanilla CSS with modern glassmorphism design

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or MongoDB Atlas)

### Backend Setup

```bash
cd server
npm install
```

Create a `.env` file (already created with defaults):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/exam_portal
```

Seed the database with demo data:
```bash
npm run seed
```

Start the server:
```bash
npm start
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

## 🔐 Demo Credentials

| Role    | Email              | Password   |
|---------|-------------------|------------|
| Admin   | admin@exam.com    | admin123   |
| Student | student@exam.com  | student123 |

## 📱 Pages

1. **Landing Page** - Role selection
2. **Admin Login** - Admin authentication
3. **Admin Dashboard** - Exam management
4. **Student Login** - Student authentication
5. **Student Dashboard** - View available exams
6. **Exam Page** - Take exam with fullscreen mode

## 🖥️ Fullscreen Enforcement

When a student starts an exam:
- The page enters fullscreen mode
- Exiting fullscreen triggers a warning overlay
- Violations are logged and counted
- Automatic request to return to fullscreen

## 📂 Project Structure

```
Exam Portal/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── services/      # API layer
│   │   ├── styles/        # CSS files
│   │   └── utils/         # Fullscreen logic
│   └── package.json
│
├── server/                 # Express Backend
│   ├── config/            # Database config
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── seed/              # Demo data seeder
│   └── package.json
│
└── README.md
```

## 🔮 Future Enhancements

- AI-based cheating detection
- Behavioral biometrics monitoring
- Video proctoring
- Advanced anomaly detection

---

**Part of**: Online Examination Integrity Assessment Using Behavioral Biometrics and Anomaly Detection
