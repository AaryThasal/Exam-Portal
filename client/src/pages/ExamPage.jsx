import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsAPI, violationsAPI, sessionsAPI } from '../services/api';
import {
    enterFullscreen,
    handleFullscreenChange,
    handleTabSwitch,
    isFullscreen
} from '../utils/fullscreen';
import { requestCamera, stopCamera, monitorCamera } from '../utils/camera';
import '../styles/ExamPage.css';

function ExamPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [examStarted, setExamStarted] = useState(false);
    const [examSubmitted, setExamSubmitted] = useState(false);
    const [fullscreenViolations, setFullscreenViolations] = useState(0);
    const [tabViolations, setTabViolations] = useState(0);
    const [cameraViolations, setCameraViolations] = useState(0);
    const [cameraStream, setCameraStream] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isBlurred, setIsBlurred] = useState(false);
    const violationsLogged = useRef(new Set());
    const videoRef = useRef(null);
    const examStartTime = useRef(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/student/login');
            return;
        }
        setUser(JSON.parse(storedUser));
        fetchExam();
    }, [id, navigate]);

    // Timer
    useEffect(() => {
        if (!examStarted || examSubmitted || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [examStarted, examSubmitted]);

    // Fullscreen exit detection
    useEffect(() => {
        if (!examStarted || examSubmitted || !exam || !user) return;

        const cleanup = handleFullscreenChange(
            async (count) => {
                setFullscreenViolations(count);
                setIsBlurred(true);

                const key = `fs_${count}`;
                if (!violationsLogged.current.has(key)) {
                    violationsLogged.current.add(key);
                    try {
                        await violationsAPI.log({
                            examId: exam._id,
                            examTitle: exam.title,
                            studentId: user._id,
                            studentName: user.name,
                            studentEmail: user.email,
                            violationType: 'fullscreen_exit'
                        });
                    } catch (error) {
                        console.error('Failed to log violation:', error);
                    }
                }
            },
            () => setIsBlurred(false)
        );

        return cleanup;
    }, [examStarted, examSubmitted, exam, user]);

    // Tab switch detection
    useEffect(() => {
        if (!examStarted || examSubmitted || !exam || !user) return;

        const cleanup = handleTabSwitch(
            async (count) => {
                setTabViolations(count);
                setIsBlurred(true);

                const key = `tab_${count}`;
                if (!violationsLogged.current.has(key)) {
                    violationsLogged.current.add(key);
                    try {
                        await violationsAPI.log({
                            examId: exam._id,
                            examTitle: exam.title,
                            studentId: user._id,
                            studentName: user.name,
                            studentEmail: user.email,
                            violationType: 'tab_switch'
                        });
                    } catch (error) {
                        console.error('Failed to log violation:', error);
                    }
                }
            },
            () => setIsBlurred(false)
        );

        return cleanup;
    }, [examStarted, examSubmitted, exam, user]);

    // Camera monitoring
    useEffect(() => {
        if (!examStarted || examSubmitted || !exam || !user || !cameraStream) return;

        const cleanup = monitorCamera(
            cameraStream,
            async (count) => {
                setCameraViolations(count);
                setIsBlurred(true);

                const key = `cam_${count}`;
                if (!violationsLogged.current.has(key)) {
                    violationsLogged.current.add(key);
                    try {
                        await violationsAPI.log({
                            examId: exam._id,
                            examTitle: exam.title,
                            studentId: user._id,
                            studentName: user.name,
                            studentEmail: user.email,
                            violationType: 'camera_off'
                        });
                    } catch (error) {
                        console.error('Failed to log camera violation:', error);
                    }
                }
            },
            () => setIsBlurred(false)
        );

        return cleanup;
    }, [examStarted, examSubmitted, exam, user, cameraStream]);

    // Callback ref to attach camera stream as soon as video element mounts
    const setCameraVideoRef = useCallback((el) => {
        videoRef.current = el;
        if (el && cameraStream) {
            el.srcObject = cameraStream;
        }
    }, [cameraStream]);

    // Stop camera on exam submit
    useEffect(() => {
        return () => {
            if (cameraStream) {
                stopCamera(cameraStream);
            }
        };
    }, [cameraStream]);

    const fetchExam = async () => {
        try {
            const data = await examsAPI.getById(id);
            setExam(data);
            setTimeRemaining(data.duration * 60);
        } catch (error) {
            console.error('Failed to fetch exam:', error);
            alert('Failed to load exam');
            navigate('/student/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleStartExam = async () => {
        // Request camera first
        const stream = await requestCamera();
        if (!stream) {
            alert('Camera access is required to start the exam.');
            return;
        }
        setCameraStream(stream);

        // Then enter fullscreen
        const success = await enterFullscreen();
        if (success || isFullscreen()) {
            examStartTime.current = new Date();
            setExamStarted(true);
        } else {
            stopCamera(stream);
            setCameraStream(null);
            alert('Please allow fullscreen mode to start the exam.');
        }
    };

    const handleAnswerSelect = (questionIndex, optionIndex) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [questionIndex]: optionIndex
        });
    };

    const handleSubmit = useCallback(async () => {
        setExamSubmitted(true);
        if (cameraStream) {
            stopCamera(cameraStream);
            setCameraStream(null);
        }
        let correct = 0;
        exam.questions.forEach((q, index) => {
            if (selectedAnswers[index] === q.correctAnswer) {
                correct++;
            }
        });

        // Save exam session
        const endTime = new Date();
        const startTime = examStartTime.current || endTime;
        const durationMs = endTime - startTime;
        const durationMin = Math.round(durationMs / 60000);

        try {
            await sessionsAPI.create({
                examId: exam._id,
                examTitle: exam.title,
                studentId: user._id,
                studentName: user.name,
                studentEmail: user.email,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: durationMin,
                fullscreenExits: fullscreenViolations,
                tabSwitches: tabViolations,
                cameraOffs: cameraViolations,
                totalViolations: fullscreenViolations + tabViolations + cameraViolations,
                score: { correct, total: exam.questions.length }
            });
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }, [exam, selectedAnswers, cameraStream, user, fullscreenViolations, tabViolations, cameraViolations]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalViolations = fullscreenViolations + tabViolations + cameraViolations;

    if (loading) {
        return (
            <div className="exam-page">
                <div className="loading-spinner">Loading exam...</div>
            </div>
        );
    }

    // Pre-exam screen
    if (!examStarted) {
        return (
            <div className="exam-page pre-exam">
                <div className="pre-exam-container">
                    <div className="exam-info-card">
                        <h1>{exam.title}</h1>
                        <div className="exam-details">
                            <div className="detail-item">
                                <span className="detail-icon">📝</span>
                                <span>{exam.questions?.length || 0} Questions</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-icon">⏱️</span>
                                <span>{exam.duration} Minutes</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-icon">📋</span>
                                <span>{exam.type}</span>
                            </div>
                        </div>

                        <div className="fullscreen-warning">
                            <h3>⚠️ Important Instructions</h3>
                            <ul>
                                <li>This exam requires <strong>fullscreen mode</strong></li>
                                <li>Exiting fullscreen will be recorded as a violation</li>
                                <li><strong>Switching browser tabs is prohibited</strong></li>
                                <li>Your <strong>camera must remain on</strong> throughout the exam</li>
                                <li>Multiple violations may invalidate your exam</li>
                            </ul>
                        </div>

                        <button className="start-exam-btn" onClick={handleStartExam}>
                            🚀 Start Exam in Fullscreen
                        </button>

                        <button className="back-btn" onClick={() => navigate('/student/dashboard')}>
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Post-exam screen
    if (examSubmitted) {
        const totalQuestions = exam.questions.length;
        const answered = Object.keys(selectedAnswers).length;
        let correct = 0;
        exam.questions.forEach((q, index) => {
            if (selectedAnswers[index] === q.correctAnswer) {
                correct++;
            }
        });

        return (
            <div className="exam-page exam-completed">
                <div className="completion-container">
                    <div className="completion-card">
                        <div className="completion-icon">✅</div>
                        <h1>Exam Completed!</h1>

                        <div className="results-summary">
                            <div className="result-item">
                                <span className="result-label">Questions Answered</span>
                                <span className="result-value">{answered}/{totalQuestions}</span>
                            </div>
                            <div className="result-item">
                                <span className="result-label">Correct Answers</span>
                                <span className="result-value correct">{correct}/{totalQuestions}</span>
                            </div>
                            <div className="result-item">
                                <span className="result-label">Violations</span>
                                <span className={`result-value ${totalViolations > 0 ? 'violations' : ''}`}>
                                    {totalViolations}
                                </span>
                            </div>
                        </div>

                        <button className="back-btn" onClick={() => navigate('/student/dashboard')}>
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Active exam screen
    const question = exam.questions[currentQuestion];

    return (
        <div className={`exam-page exam-active ${isBlurred ? 'blurred' : ''}`}>
            <header className="exam-header">
                <div className="exam-title">
                    <h1>{exam.title}</h1>
                </div>
                <div className="exam-timer">
                    <span className={`timer ${timeRemaining < 60 ? 'timer-warning' : ''}`}>
                        ⏱️ {formatTime(timeRemaining)}
                    </span>
                </div>
                <div className="exam-violations">
                    <span className={`violations-badge ${totalViolations > 0 ? 'has-violations' : ''}`}>
                        ⚠️ Violations: {totalViolations}
                    </span>
                </div>
            </header>

            <div className="question-nav">
                {exam.questions.map((_, index) => (
                    <button
                        key={index}
                        className={`question-nav-btn ${currentQuestion === index ? 'active' : ''} ${selectedAnswers[index] !== undefined ? 'answered' : ''}`}
                        onClick={() => setCurrentQuestion(index)}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>

            <main className="exam-content">
                <div className="question-card">
                    <div className="question-header">
                        <span className="question-number">Question {currentQuestion + 1} of {exam.questions.length}</span>
                    </div>

                    <div className="question-text">
                        <p>{question.questionText}</p>
                    </div>

                    <div className="options-list">
                        {question.options.map((option, optionIndex) => (
                            <button
                                key={optionIndex}
                                className={`option-btn ${selectedAnswers[currentQuestion] === optionIndex ? 'selected' : ''}`}
                                onClick={() => handleAnswerSelect(currentQuestion, optionIndex)}
                            >
                                <span className="option-letter">
                                    {String.fromCharCode(65 + optionIndex)}
                                </span>
                                <span className="option-text">{option}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="exam-navigation">
                    <button
                        className="nav-btn prev-btn"
                        disabled={currentQuestion === 0}
                        onClick={() => setCurrentQuestion(currentQuestion - 1)}
                    >
                        ← Previous
                    </button>

                    {currentQuestion === exam.questions.length - 1 ? (
                        <button className="nav-btn submit-btn" onClick={handleSubmit}>
                            Submit Exam
                        </button>
                    ) : (
                        <button
                            className="nav-btn next-btn"
                            onClick={() => setCurrentQuestion(currentQuestion + 1)}
                        >
                            Next →
                        </button>
                    )}
                </div>
            </main>

            {/* Camera Preview */}
            {cameraStream && (
                <div className="camera-preview">
                    <video
                        ref={setCameraVideoRef}
                        autoPlay
                        playsInline
                        muted
                    />
                    <span className="camera-label">📷 Live</span>
                </div>
            )}
        </div>
    );
}

export default ExamPage;
