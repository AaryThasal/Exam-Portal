import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI, sessionsAPI } from '../services/api';
import '../styles/IntegrityDashboard.css';

function IntegrityDashboard() {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState(null);

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
        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        try {
            const [examsData, sessionsData] = await Promise.all([
                examsAPI.getAll(),
                sessionsAPI.getAll()
            ]);
            setExams(examsData);
            setSessions(sessionsData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getExamStats = (examId) => {
        const examSessions = sessions.filter(s => s.examId === examId);
        const totalViolations = examSessions.reduce((sum, s) => sum + (s.totalViolations || 0), 0);
        const autoSubmitted = examSessions.filter(s => s.autoSubmitReason === 'face_not_detected').length;
        return {
            studentsAttempted: examSessions.length,
            totalViolations,
            autoSubmitted
        };
    };

    const getExamSessions = (examId) => {
        return sessions.filter(s => s.examId === examId);
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
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    // Exam-level sessions view (when an exam is selected)
    if (selectedExam) {
        const examSessions = getExamSessions(selectedExam._id);
        return (
            <div className="integrity-page">
                <header className="integrity-header">
                    <div className="header-left">
                        <button className="back-btn" onClick={() => setSelectedExam(null)}>
                            ← Back to Exams
                        </button>
                        <h1>📊 {selectedExam.title} — Exam Report</h1>
                    </div>
                    <div className="header-stats">
                        <span className="exam-type-pill">{selectedExam.type}</span>
                        <span>Submissions: <strong>{examSessions.length}</strong></span>
                    </div>
                </header>

                <main className="integrity-content">
                    {examSessions.length === 0 ? (
                        <div className="no-violations">
                            <span className="no-violations-icon">📋</span>
                            <h2>No Submissions Yet</h2>
                            <p>No students have attempted this exam yet.</p>
                        </div>
                    ) : (
                        <div className="integrity-table-container">
                            <table className="integrity-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Date</th>
                                        <th>Duration</th>
                                        <th>Fullscreen Exits</th>
                                        <th>Tab Switches</th>
                                        <th>Camera Interruptions</th>
                                        <th>Face Not Detected</th>
                                        <th>Total Violations</th>
                                        <th>Status</th>
                                        {selectedExam.type === 'MCQ' && <th>Score</th>}
                                        {selectedExam.type === 'Coding' && <th>Code</th>}
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {examSessions.map((session) => (
                                        <tr
                                            key={session._id}
                                            className="clickable-row"
                                            onClick={() => navigate(`/admin/session/${session._id}`)}
                                        >
                                            <td className="student-name">
                                                <div>{session.studentName}</div>
                                                <small className="student-email">{session.studentEmail}</small>
                                            </td>
                                            <td>{formatDate(session.startTime)}</td>
                                            <td>{session.duration} min</td>
                                            <td className="count-cell">
                                                <span className={session.fullscreenExits > 0 ? 'has-violations-text' : ''}>
                                                    {session.fullscreenExits || 0}
                                                </span>
                                            </td>
                                            <td className="count-cell">
                                                <span className={session.tabSwitches > 0 ? 'has-violations-text' : ''}>
                                                    {session.tabSwitches || 0}
                                                </span>
                                            </td>
                                            <td className="count-cell">
                                                <span className={session.cameraInterruptions > 0 ? 'has-violations-text' : ''}>
                                                    {session.cameraInterruptions || 0}
                                                </span>
                                            </td>
                                            <td className="count-cell">
                                                <span className={session.faceNotDetected > 0 ? 'has-violations-text' : ''}>
                                                    {session.faceNotDetected || 0}
                                                    {session.autoSubmitReason === 'face_not_detected' && (
                                                        <span className="auto-submit-badge" title="Exam was auto-submitted due to face not detected">
                                                            ⛔
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="count-cell">
                                                <span className={session.totalViolations > 0 ? 'has-violations-text' : ''}>
                                                    {session.totalViolations || 0}
                                                </span>
                                            </td>
                                            <td className="count-cell">
                                                {session.autoSubmitReason === 'face_not_detected' ? (
                                                    <span className="status-badge auto-submitted">⛔ Auto-Submitted</span>
                                                ) : (
                                                    <span className="status-badge completed">✅ Completed</span>
                                                )}
                                            </td>
                                            {selectedExam.type === 'MCQ' && (
                                                <td className="count-cell">
                                                    {session.score?.correct}/{session.score?.total}
                                                </td>
                                            )}
                                            {selectedExam.type === 'Coding' && (
                                                <td className="count-cell">
                                                    {session.codeSubmission ? '✅ Submitted' : '—'}
                                                </td>
                                            )}
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

    // Exam list view (default)
    return (
        <div className="integrity-page">
            <header className="integrity-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                        ← Back to Dashboard
                    </button>
                    <h1>📊 Exam Reports</h1>
                </div>
                <div className="header-stats">
                    <span>Total Exams: <strong>{exams.length}</strong></span>
                    <span>Total Submissions: <strong>{sessions.length}</strong></span>
                </div>
            </header>

            <main className="integrity-content">
                {exams.length === 0 ? (
                    <div className="no-violations">
                        <span className="no-violations-icon">📋</span>
                        <h2>No Exams Created</h2>
                        <p>Create exams first to see reports.</p>
                    </div>
                ) : (
                    <div className="exams-violations-grid">
                        {exams.map((exam) => {
                            const stats = getExamStats(exam._id);
                            return (
                                <div
                                    key={exam._id}
                                    className="exam-violations-card"
                                    onClick={() => setSelectedExam(exam)}
                                >
                                    <div className="evc-header">
                                        <span className={`exam-type-pill ${exam.type === 'Coding' ? 'coding' : 'mcq'}`}>
                                            {exam.type}
                                        </span>
                                        <span className="evc-date">
                                            {new Date(exam.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="evc-title">{exam.title}</h3>
                                    <div className="evc-stats">
                                        <div className="evc-stat">
                                            <span className="evc-stat-value">{stats.studentsAttempted}</span>
                                            <span className="evc-stat-label">Submissions</span>
                                        </div>
                                        <div className="evc-stat">
                                            <span className={`evc-stat-value ${stats.totalViolations > 0 ? 'has-violations-text' : ''}`}>
                                                {stats.totalViolations}
                                            </span>
                                            <span className="evc-stat-label">Violations</span>
                                        </div>
                                        <div className="evc-stat">
                                            <span className="evc-stat-value">{exam.duration} min</span>
                                            <span className="evc-stat-label">Duration</span>
                                        </div>
                                    </div>
                                    <div className="evc-footer">
                                        <span className="view-details-link">View Report →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default IntegrityDashboard;
