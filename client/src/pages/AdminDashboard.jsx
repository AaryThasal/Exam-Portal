import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI } from '../services/api';
import '../styles/Dashboard.css';

function AdminDashboard() {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/admin/login');
            return;
        }

        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'admin') {
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

    const handleDeleteExam = async (examId, examTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${examTitle}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await examsAPI.delete(examId);
            setExams(exams.filter(exam => exam._id !== examId));
        } catch (error) {
            console.error('Failed to delete exam:', error);
            alert('Failed to delete exam. Please try again.');
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
        <div className="dashboard-page admin-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <span className="header-icon">👨‍💼</span>
                    <div>
                        <h1>Admin Dashboard</h1>
                        <p>Welcome, {user?.name}</p>
                    </div>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </header>

            {/* Main Content */}
            <main className="dashboard-content">
                {/* Action Buttons */}
                <div className="dashboard-actions">
                    <h2>Manage Examinations</h2>
                    <div className="action-buttons">
                        <button
                            className="create-exam-btn"
                            onClick={() => navigate('/admin/create-exam')}
                        >
                            ➕ Create New Exam
                        </button>
                        <button
                            className="view-violations-btn"
                            onClick={() => navigate('/admin/violations')}
                        >
                            ⚠️ View Violations
                        </button>
                    </div>
                </div>

                <div className="exams-section">
                    <h3>All Exams ({exams.length})</h3>

                    {exams.length === 0 ? (
                        <div className="no-exams">
                            <p>No exams created yet.</p>
                            <p>Click "Create New Exam" to get started.</p>
                        </div>
                    ) : (
                        <div className="exams-grid">
                            {exams.map((exam) => (
                                <div key={exam._id} className="exam-card admin-exam-card">
                                    <div className="exam-card-header">
                                        <span className="exam-type-badge">{exam.type}</span>
                                        <span className="exam-duration">{exam.duration} min</span>
                                    </div>
                                    <h4>{exam.title}</h4>
                                    <p className="exam-questions">
                                        {exam.questions?.length || 0} Questions
                                    </p>
                                    <p className="exam-created">
                                        Created: {new Date(exam.createdAt).toLocaleDateString()}
                                    </p>
                                    <button
                                        className="delete-exam-btn"
                                        onClick={() => handleDeleteExam(exam._id, exam.title)}
                                    >
                                        🗑️ Delete
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

export default AdminDashboard;
