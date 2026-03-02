import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../services/api';
import '../styles/SessionReport.css';

function SessionReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

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
        fetchSession();
    }, [id, navigate]);

    const fetchSession = async () => {
        try {
            const data = await sessionsAPI.getById(id);
            setSession(data);
        } catch (error) {
            console.error('Failed to fetch session:', error);
            alert('Session not found');
            navigate('/admin/violations');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateStr) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    if (loading) {
        return (
            <div className="report-page">
                <div className="loading-spinner">Loading session report...</div>
            </div>
        );
    }

    if (!session) return null;

    const integrityScore = session.totalViolations === 0
        ? 'Excellent'
        : session.totalViolations <= 2
            ? 'Fair'
            : 'Poor';

    const integrityClass = session.totalViolations === 0
        ? 'excellent'
        : session.totalViolations <= 2
            ? 'fair'
            : 'poor';

    return (
        <div className="report-page">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate('/admin/violations')}>
                    ← Back to Violations
                </button>
                <h1>📋 Session Integrity Report</h1>
            </header>

            <main className="report-content">
                {/* Student & Exam Info */}
                <div className="report-section info-section">
                    <div className="info-card">
                        <span className="info-icon">👤</span>
                        <div>
                            <span className="info-label">Student</span>
                            <span className="info-value">{session.studentName}</span>
                            <span className="info-sub">{session.studentEmail}</span>
                        </div>
                    </div>
                    <div className="info-card">
                        <span className="info-icon">📝</span>
                        <div>
                            <span className="info-label">Exam</span>
                            <span className="info-value">{session.examTitle}</span>
                            <span className="info-sub">{session.examType || 'MCQ'}</span>
                        </div>
                    </div>
                    {session.examType !== 'Coding' && (
                    <div className="info-card">
                        <span className="info-icon">🏆</span>
                        <div>
                            <span className="info-label">Score</span>
                            <span className="info-value">{session.score?.correct}/{session.score?.total}</span>
                        </div>
                    </div>
                    )}
                </div>

                {/* Timing */}
                <div className="report-section">
                    <h2>⏱️ Session Timing</h2>
                    <div className="timing-grid">
                        <div className="timing-item">
                            <span className="timing-label">Started</span>
                            <span className="timing-value">{formatDateTime(session.startTime)}</span>
                        </div>
                        <div className="timing-item">
                            <span className="timing-label">Ended</span>
                            <span className="timing-value">{formatDateTime(session.endTime)}</span>
                        </div>
                        <div className="timing-item">
                            <span className="timing-label">Duration</span>
                            <span className="timing-value">{session.duration} min</span>
                        </div>
                    </div>
                </div>

                {/* Integrity Assessment */}
                <div className="report-section">
                    <h2>🛡️ Integrity Assessment</h2>
                    <div className={`integrity-badge ${integrityClass}`}>
                        {integrityScore}
                    </div>
                    <div className="violations-grid">
                        <div className="violation-card">
                            <span className="violation-icon">🖥️</span>
                            <span className="violation-count">{session.fullscreenExits}</span>
                            <span className="violation-type">Fullscreen Exits</span>
                        </div>
                        <div className="violation-card">
                            <span className="violation-icon">🔀</span>
                            <span className="violation-count">{session.tabSwitches}</span>
                            <span className="violation-type">Tab Switches</span>
                        </div>
                        <div className="violation-card">
                            <span className="violation-icon">📷</span>
                            <span className="violation-count">{session.cameraOffs}</span>
                            <span className="violation-type">Camera Off</span>
                        </div>
                        <div className="violation-card">
                            <span className="violation-icon">🚫</span>
                            <span className="violation-count">{session.cameraInterruptions || 0}</span>
                            <span className="violation-type">Camera Interruptions</span>
                        </div>
                        <div className="violation-card total-card">
                            <span className="violation-icon">⚠️</span>
                            <span className="violation-count">{session.totalViolations}</span>
                            <span className="violation-type">Total Violations</span>
                        </div>
                    </div>
                </div>

                {/* Code Submission (Coding exams only) */}
                {session.examType === 'Coding' && (
                    <div className="report-section">
                        <h2>💻 Code Submission</h2>
                        {session.codeSubmission ? (
                            <div className="code-submission-block">
                                <pre className="code-display">{session.codeSubmission}</pre>
                            </div>
                        ) : (
                            <p className="no-code-text">No code was submitted.</p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default SessionReport;
