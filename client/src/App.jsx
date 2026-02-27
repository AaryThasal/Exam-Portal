import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CreateExam from './pages/CreateExam';
import IntegrityDashboard from './pages/IntegrityDashboard';
import StudentLogin from './pages/StudentLogin';
import StudentDashboard from './pages/StudentDashboard';
import ExamPage from './pages/ExamPage';
import CodingExamPage from './pages/CodingExamPage';
import SessionReport from './pages/SessionReport';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/create-exam" element={<CreateExam />} />
        <Route path="/admin/violations" element={<IntegrityDashboard />} />
        <Route path="/admin/session/:id" element={<SessionReport />} />

        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />

        {/* Exam Routes */}
        <Route path="/exam/:id" element={<ExamPage />} />
        <Route path="/coding-exam/:id" element={<CodingExamPage />} />
      </Routes>
    </Router>
  );
}

export default App;
