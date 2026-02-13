import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../services/api';
import '../styles/IntegrityDashboard.css';

function IntegrityDashboard() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterExam, setFilterExam] = useState('');

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
        fetchSessions();
    }, [navigate]);

    const fetchSessions = async () => {
        try {
            const data = await sessionsAPI.getAll();
            setSessions(data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredData = () => {
        if (!filterExam) return sessions;
        return sessions.filter(item => item.examTitle === filterExam);
    };

    const getUniqueExams = () => {
        return [...new Set(sessions.map(item => item.examTitle))];
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    if (loading) {
        return (
            <div className="integrity-page">
                <div className="loading-spinner">Loading sessions...</div>
            </div>
        );
    }

    const filteredData = getFilteredData();

    return (
        <div className="integrity-page">
            <header className="integrity-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                        ← Back to Dashboard
                    </button>
                    <h1>📋 Exam Session Reports</h1>
                </div>
                <div className="header-stats">
                    <span>Total Sessions: <strong>{sessions.length}</strong></span>
                </div>
            </header>

            {/* Exam Filter */}
            <div className="filter-section">
                <label>Filter by Exam:</label>
                <select
                    value={filterExam}
                    onChange={(e) => setFilterExam(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Exams</option>
                    {getUniqueExams().map(exam => (
                        <option key={exam} value={exam}>{exam}</option>
                    ))}
                </select>
            </div>

            {/* Sessions Table */}
            <main className="integrity-content">
                {filteredData.length === 0 ? (
                    <div className="no-violations">
                        <span className="no-violations-icon">📋</span>
                        <h2>No Sessions Recorded</h2>
                        <p>No exam sessions have been completed yet.</p>
                    </div>
                ) : (
                    <div className="integrity-table-container">
                        <table className="integrity-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Exam</th>
                                    <th>Date</th>
                                    <th>Duration</th>
                                    <th>Violations</th>
                                    <th>Score</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((session) => (
                                    <tr
                                        key={session._id}
                                        className="clickable-row"
                                        onClick={() => navigate(`/admin/session/${session._id}`)}
                                    >
                                        <td className="student-name">{session.studentName}</td>
                                        <td className="exam-title">{session.examTitle}</td>
                                        <td>{formatDate(session.startTime)}</td>
                                        <td>{session.duration} min</td>
                                        <td className="count-cell">
                                            <span className={session.totalViolations > 0 ? 'has-violations-text' : ''}>
                                                {session.totalViolations}
                                            </span>
                                        </td>
                                        <td className="count-cell">
                                            {session.score?.correct}/{session.score?.total}
                                        </td>
                                        <td>
                                            <button
                                                className="view-report-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/admin/session/${session._id}`);
                                                }}
                                            >
                                                View Report
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}

export default IntegrityDashboard;
