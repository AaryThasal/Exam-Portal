import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/AuthPages.css';

function StudentLogin() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await authAPI.login(formData.email, formData.password, 'student');
            localStorage.setItem('user', JSON.stringify(user));
            navigate('/student/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page student-auth">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <span className="auth-icon">🎓</span>
                        <h1>Student Login</h1>
                        <p>Access Your Examinations</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="student@exam.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        <button type="submit" className="auth-submit-btn student-submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login as Student'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <button className="back-btn" onClick={() => navigate('/')}>
                            ← Back to Home
                        </button>
                    </div>

                    <div className="demo-credentials">
                        <p><strong>Demo:</strong> student@exam.com / student123</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StudentLogin;
