import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI } from '../services/api';
import '../styles/CreateExam.css';

function CreateExam() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [saving, setSaving] = useState(false);
    const [examData, setExamData] = useState({
        title: '',
        type: 'MCQ',
        duration: 30,
        problemDescription: '',
        questions: [
            {
                questionText: '',
                options: ['', '', '', ''],
                correctAnswer: 0
            }
        ]
    });

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
    }, [navigate]);

    const handleExamChange = (field, value) => {
        setExamData({ ...examData, [field]: value });
    };

    const handleQuestionChange = (qIndex, field, value) => {
        const newQuestions = [...examData.questions];
        newQuestions[qIndex][field] = value;
        setExamData({ ...examData, questions: newQuestions });
    };

    const handleOptionChange = (qIndex, optIndex, value) => {
        const newQuestions = [...examData.questions];
        newQuestions[qIndex].options[optIndex] = value;
        setExamData({ ...examData, questions: newQuestions });
    };

    const addQuestion = () => {
        setExamData({
            ...examData,
            questions: [
                ...examData.questions,
                {
                    questionText: '',
                    options: ['', '', '', ''],
                    correctAnswer: 0
                }
            ]
        });
    };

    const removeQuestion = (index) => {
        if (examData.questions.length <= 1) {
            alert('Exam must have at least one question');
            return;
        }
        const newQuestions = examData.questions.filter((_, i) => i !== index);
        setExamData({ ...examData, questions: newQuestions });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!examData.title.trim()) {
            alert('Please enter exam title');
            return;
        }

        if (examData.type === 'Coding') {
            if (!examData.problemDescription.trim()) {
                alert('Please enter a problem description for the coding exam');
                return;
            }
        } else {
            for (let i = 0; i < examData.questions.length; i++) {
                const q = examData.questions[i];
                if (!q.questionText.trim()) {
                    alert(`Please enter question text for Question ${i + 1}`);
                    return;
                }
                for (let j = 0; j < q.options.length; j++) {
                    if (!q.options[j].trim()) {
                        alert(`Please enter Option ${j + 1} for Question ${i + 1}`);
                        return;
                    }
                }
            }
        }

        setSaving(true);
        try {
            await examsAPI.create({
                ...examData,
                createdBy: user._id
            });
            alert('Exam created successfully!');
            navigate('/admin/dashboard');
        } catch (error) {
            console.error('Create exam error:', error);
            alert('Failed to create exam. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="create-exam-page">
            <header className="create-exam-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                        ← Back
                    </button>
                    <h1>Create New Exam</h1>
                </div>
            </header>

            <main className="create-exam-content">
                <form onSubmit={handleSubmit} className="exam-form">
                    {/* Exam Details */}
                    <section className="form-section">
                        <h2>Exam Details</h2>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="title">Exam Title *</label>
                                <input
                                    type="text"
                                    id="title"
                                    value={examData.title}
                                    onChange={(e) => handleExamChange('title', e.target.value)}
                                    placeholder="e.g., Introduction to JavaScript"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row two-columns">
                            <div className="form-group">
                                <label htmlFor="type">Exam Type</label>
                                <select
                                    id="type"
                                    value={examData.type}
                                    onChange={(e) => handleExamChange('type', e.target.value)}
                                >
                                    <option value="MCQ">Multiple Choice (MCQ)</option>
                                    <option value="Coding">Coding</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="duration">Duration (minutes)</label>
                                <input
                                    type="number"
                                    id="duration"
                                    value={examData.duration}
                                    onChange={(e) => handleExamChange('duration', parseInt(e.target.value) || 30)}
                                    min="5"
                                    max="180"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Coding Problem Description */}
                    {examData.type === 'Coding' && (
                        <section className="form-section">
                            <h2>Problem Description</h2>
                            <div className="form-group">
                                <label htmlFor="problemDescription">Describe the coding problem *</label>
                                <textarea
                                    id="problemDescription"
                                    value={examData.problemDescription}
                                    onChange={(e) => handleExamChange('problemDescription', e.target.value)}
                                    placeholder="Enter the coding problem description, requirements, constraints, examples..."
                                    rows="8"
                                    required
                                />
                            </div>
                        </section>
                    )}

                    {/* Questions (MCQ only) */}
                    {examData.type === 'MCQ' && (
                    <section className="form-section questions-section">
                        <div className="section-header">
                            <h2>Questions ({examData.questions.length})</h2>
                        </div>

                        {examData.questions.map((question, qIndex) => (
                            <div key={qIndex} className="question-card">
                                <div className="question-card-header">
                                    <span className="question-number">Question {qIndex + 1}</span>
                                    <button
                                        type="button"
                                        className="remove-question-btn"
                                        onClick={() => removeQuestion(qIndex)}
                                    >
                                        ✕ Remove
                                    </button>
                                </div>

                                <div className="form-group">
                                    <label>Question Text *</label>
                                    <textarea
                                        value={question.questionText}
                                        onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                                        placeholder="Enter your question here..."
                                        rows="2"
                                        required
                                    />
                                </div>

                                <div className="options-grid">
                                    {question.options.map((option, optIndex) => (
                                        <div key={optIndex} className="option-input-group">
                                            <label>
                                                <input
                                                    type="radio"
                                                    name={`correct-${qIndex}`}
                                                    checked={question.correctAnswer === optIndex}
                                                    onChange={() => handleQuestionChange(qIndex, 'correctAnswer', optIndex)}
                                                />
                                                Option {String.fromCharCode(65 + optIndex)}
                                                {question.correctAnswer === optIndex && <span className="correct-badge">✓ Correct</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                                placeholder={`Enter option ${String.fromCharCode(65 + optIndex)}`}
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <button type="button" className="add-question-btn" onClick={addQuestion}>
                            + Add Question
                        </button>
                    </section>
                    )}

                    {/* Submit */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={() => navigate('/admin/dashboard')}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="save-btn" disabled={saving}>
                            {saving ? 'Saving...' : '💾 Save Exam'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default CreateExam;
