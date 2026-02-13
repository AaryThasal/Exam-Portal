import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            <div className="landing-container">
                {/* Background decorations */}
                <div className="bg-decoration bg-decoration-1"></div>
                <div className="bg-decoration bg-decoration-2"></div>

                {/* Main content */}
                <div className="landing-content">
                    <div className="logo-section">
                        <div className="logo-icon">📝</div>
                        <h1 className="landing-title">Online Examination Portal</h1>
                        <p className="landing-subtitle">
                            Secure, Reliable, and AI-Powered Assessment Platform
                        </p>
                    </div>

                    <div className="feature-badges">
                        <span className="badge">🔒 Secure</span>
                        <span className="badge">🖥️ Fullscreen Mode</span>
                        <span className="badge">🤖 AI Monitoring</span>
                    </div>

                    <div className="login-options">
                        <button
                            className="login-btn admin-btn"
                            onClick={() => navigate('/admin/login')}
                        >
                            <span className="btn-icon">👨‍💼</span>
                            <span className="btn-text">
                                <span className="btn-title">Admin Login</span>
                                <span className="btn-desc">Exam Coordinator Access</span>
                            </span>
                        </button>

                        <button
                            className="login-btn student-btn"
                            onClick={() => navigate('/student/login')}
                        >
                            <span className="btn-icon">🎓</span>
                            <span className="btn-text">
                                <span className="btn-title">Student Login</span>
                                <span className="btn-desc">Take Your Exam</span>
                            </span>
                        </button>
                    </div>

                    <div className="landing-footer">
                        <p>Online Examination Integrity Assessment</p>
                        <p className="tech-stack">Built with MERN Stack</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LandingPage;
