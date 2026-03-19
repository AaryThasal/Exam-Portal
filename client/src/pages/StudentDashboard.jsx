import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI } from '../services/api';
import '../styles/Dashboard.css';

function StudentDashboard() {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/student/login');
            return;
        }

        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'student') {
            navigate('/');
            return;
        }

        setUser(parsedUser);
        fetchExams();
    }, [navigate]);

    const fetchExams = async () => {
        try {
            const data = await examsAPI.getAll();
            setExams(data);
        } catch (error) {
            console.error('Failed to fetch exams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartExam = (exam) => {
        if (exam.type === 'Coding') {
            navigate(`/coding-exam/${exam._id}`);
        } else {
            navigate(`/exam/${exam._id}`);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-page student-dashboard">
            {/* Header */}
            <header className="dashboard-header student-header">
                <div className="header-left">
                    <span className="header-icon">🎓</span>
                    <div>
                        <h1>Student Dashboard</h1>
                        <p>Welcome, {user?.name}</p>
                    </div>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </header>

            {/* Main Content */}
            <main className="dashboard-content">
                <div className="exams-section">
                    <h3>Your Examinations</h3>

                    {exams.length === 0 ? (
                        <div className="no-exams">
                            <p>No exams available</p>
                        </div>
                    ) : (
                        <div className="exams-grid">
                            {exams.map((exam) => (
                                <div key={exam._id} className="exam-card student-exam-card">
                                    <div className="exam-card-header">
                                        <span className="exam-type-badge">{exam.type}</span>
                                        <span className="exam-duration">{exam.duration} min</span>
                                    </div>
                                    <h4>{exam.title}</h4>
                                    <p className="exam-questions">
                                        {exam.type === 'Coding' ? 'Coding Problem' : `${exam.questions?.length || 0} Questions`}
                                    </p>
                                    <button
                                        className="start-exam-btn"
                                        onClick={() => handleStartExam(exam)}
                                    >
                                        🚀 Start Exam
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default StudentDashboard;
