import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsAPI, violationsAPI, sessionsAPI } from '../services/api';
import {
    enterFullscreen,
    handleFullscreenChange,
    handleTabSwitch,
    isFullscreen
} from '../utils/fullscreen';
import { requestCamera, stopCamera } from '../utils/camera';
import { monitorCameraInterruption } from '../utils/cameraInterruption';
import { monitorIdle } from '../utils/idle';
import { monitorFaceDetection } from '../utils/faceDetection';
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
    const [cameraInterruptions, setCameraInterruptions] = useState(0);
    const [cameraStream, setCameraStream] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isBlurred, setIsBlurred] = useState(false);
    const [idleEvents, setIdleEvents] = useState(0);
    const [showIdleWarning, setShowIdleWarning] = useState(false);
    const [faceNotDetected, setFaceNotDetected] = useState(0);
    const [autoSubmitReason, setAutoSubmitReason] = useState('');
    const violationsLogged = useRef(new Set());
    const idleEventsLogged = useRef(new Set());
    const videoRef = useRef(null);
    const examStartTime = useRef(null);
    const faceSubmitTriggered = useRef(false);
    const handleSubmitRef = useRef(null);

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

    // Camera interruption detection (obstruction, dark/frozen feed)
    useEffect(() => {
        if (!examStarted || examSubmitted || !exam || !user || !cameraStream) return;

        // Pass a getter function so the monitor can poll for the video element
        // (it may not be mounted yet when this effect first runs)
        const cleanup = monitorCameraInterruption(
            cameraStream,
            () => videoRef.current,
            async (count) => {
                setCameraInterruptions(count);
                setIsBlurred(true);

                const key = `cam_int_${count}`;
                if (!violationsLogged.current.has(key)) {
                    violationsLogged.current.add(key);
                    try {
                        await violationsAPI.log({
                            examId: exam._id,
                            examTitle: exam.title,
                            studentId: user._id,
                            studentName: user.name,
                            studentEmail: user.email,
                            violationType: 'camera_interruption'
                        });
                    } catch (error) {
                        console.error('Failed to log camera interruption:', error);
                    }
                }
            },
            () => setIsBlurred(false)
        );

        return cleanup;
    }, [examStarted, examSubmitted, exam, user, cameraStream]);

    // Disable text selection, copying, right-click during active exam
    useEffect(() => {
        if (!examStarted || examSubmitted) return;

        const blockCopy = (e) => e.preventDefault();
        const blockContextMenu = (e) => e.preventDefault();
        const blockKeyCombo = (e) => {
            // Block Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+U, Ctrl+S, Ctrl+P
            if ((e.ctrlKey || e.metaKey) && ['c', 'a', 'x', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
            // Block PrintScreen
            if (e.key === 'PrintScreen') {
                e.preventDefault();
            }
        };
        const blockDragStart = (e) => e.preventDefault();

        document.addEventListener('copy', blockCopy);
        document.addEventListener('cut', blockCopy);
        document.addEventListener('contextmenu', blockContextMenu);
        document.addEventListener('keydown', blockKeyCombo);
        document.addEventListener('dragstart', blockDragStart);
        document.addEventListener('selectstart', blockCopy);

        return () => {
            document.removeEventListener('copy', blockCopy);
            document.removeEventListener('cut', blockCopy);
            document.removeEventListener('contextmenu', blockContextMenu);
            document.removeEventListener('keydown', blockKeyCombo);
            document.removeEventListener('dragstart', blockDragStart);
            document.removeEventListener('selectstart', blockCopy);
        };
    }, [examStarted, examSubmitted]);

    // Idle activity monitoring
    useEffect(() => {
        if (!examStarted || examSubmitted || !exam || !user) return;

        const cleanup = monitorIdle(
            async (count) => {
                setIdleEvents(count);
                setShowIdleWarning(true);

                const key = `idle_${count}`;
                if (!idleEventsLogged.current.has(key)) {
                    idleEventsLogged.current.add(key);
                    try {
                        await violationsAPI.log({
                            examId: exam._id,
                            examTitle: exam.title,
                            studentId: user._id,
                            studentName: user.name,
                            studentEmail: user.email,
                            violationType: 'idle_event'
                        });
                    } catch (error) {
                        console.error('Failed to log idle event:', error);
                    }
                }
            },
            () => {
                setShowIdleWarning(false);
            }
        );

        return cleanup;
    }, [examStarted, examSubmitted, exam, user]);


    // Face detection — auto-submit if face absent for sustained duration
    useEffect(() => {
        if (!examStarted || examSubmitted || !exam || !user || !cameraStream) return;

        const cleanup = monitorFaceDetection(
            () => videoRef.current,
            async () => {
                if (faceSubmitTriggered.current) return;
                faceSubmitTriggered.current = true;

                setFaceNotDetected(1);
                setAutoSubmitReason('face_not_detected');

                // Log the violation
                const key = 'face_not_detected_auto';
                if (!violationsLogged.current.has(key)) {
                    violationsLogged.current.add(key);
                    try {
                        await violationsAPI.log({
                            examId: exam._id,
                            examTitle: exam.title,
                            studentId: user._id,
                            studentName: user.name,
                            studentEmail: user.email,
                            violationType: 'face_not_detected'
                        });
                    } catch (error) {
                        console.error('Failed to log face not detected violation:', error);
                    }
                }

                // Auto-submit using ref to get the latest handleSubmit (avoids stale closure)
                if (handleSubmitRef.current) {
                    handleSubmitRef.current('face_not_detected');
                }
            }
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
            if (data.type === 'Coding') {
                navigate(`/coding-exam/${id}`, { replace: true });
                return;
            }
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

    const handleSubmit = useCallback(async (submitReason) => {
        // Sanitize: if called from onClick, submitReason is a React event, not a string
        const reason = typeof submitReason === 'string' ? submitReason : '';
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

        const faceCount = reason === 'face_not_detected' ? 1 : 0;

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
                cameraInterruptions: cameraInterruptions,
                idleEvents: idleEvents,
                faceNotDetected: faceCount,
                totalViolations: fullscreenViolations + tabViolations + cameraInterruptions + faceCount,
                score: { correct, total: exam.questions.length },
                examType: 'MCQ',
                autoSubmitReason: reason
            });
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }, [exam, selectedAnswers, cameraStream, user, fullscreenViolations, tabViolations, cameraInterruptions, idleEvents]);

    // Keep handleSubmitRef in sync with the latest handleSubmit
    useEffect(() => {
        handleSubmitRef.current = handleSubmit;
    }, [handleSubmit]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalViolations = fullscreenViolations + tabViolations + cameraInterruptions;

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
        const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

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
                                <span className="result-label">Score</span>
                                <span className={`result-value ${percentage >= 50 ? 'correct' : 'violations'}`}>{percentage}%</span>
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
    const answeredCount = Object.keys(selectedAnswers).length;

    return (
        <div className={`exam-page exam-active ${isBlurred ? 'blurred' : ''}`}>
            {/* Top Header Bar */}
            <header className="exam-header">
                <div className="exam-header-left">
                    <div className="exam-title">
                        <span className="exam-title-icon">📝</span>
                        <h1>{exam.title}</h1>
                    </div>
                </div>
                <div className="exam-header-center">
                    <div className={`exam-timer ${timeRemaining < 60 ? 'timer-critical' : timeRemaining < 300 ? 'timer-warn' : ''}`}>
                        <span className="timer-icon">⏱️</span>
                        <span className="timer-value">{formatTime(timeRemaining)}</span>
                        <span className="timer-label">remaining</span>
                    </div>
                </div>
                <div className="exam-header-right">
                    <div className={`violations-badge ${totalViolations > 0 ? 'has-violations' : ''}`}>
                        <span className="violations-icon">⚠️</span>
                        <span className="violations-count">{totalViolations}</span>
                        <span className="violations-label">Violation{totalViolations !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </header>

            {/* Main Body — Sidebar + Content */}
            <div className="exam-body">
                {/* Sidebar: question nav + progress */}
                <aside className="exam-sidebar">
                    <div className="sidebar-section">
                        <h3 className="sidebar-heading">Questions</h3>
                        <div className="question-nav">
                            {exam.questions.map((_, index) => (
                                <button
                                    key={index}
                                    className={`question-nav-btn ${currentQuestion === index ? 'active' : ''} ${selectedAnswers[index] !== undefined ? 'answered' : ''}`}
                                    onClick={() => setCurrentQuestion(index)}
                                    title={`Question ${index + 1}${selectedAnswers[index] !== undefined ? ' (answered)' : ''}`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="sidebar-section sidebar-progress">
                        <div className="progress-info">
                            <span className="progress-label">Answered</span>
                            <span className="progress-value">{answeredCount} / {exam.questions.length}</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="exam-content">
                    <div className="question-card">
                        <div className="question-header">
                            <span className="question-number">Question {currentQuestion + 1}</span>
                            <span className="question-total">of {exam.questions.length}</span>
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
                                    ✓ Submit Exam
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
                    </div>
                </main>
            </div>

            {/* Idle Warning Toast */}
            {showIdleWarning && (
                <div className="idle-warning-toast">
                    <span className="idle-warning-icon">💤</span>
                    <span className="idle-warning-text">No activity detected. Please continue the exam.</span>
                </div>
            )}

            {/* Camera Preview */}
            {cameraStream && (
                <div className="camera-preview">
                    <video
                        ref={setCameraVideoRef}
                        autoPlay
                        playsInline
                        muted
                    />
                </div>
            )}
        </div>
    );
}

export default ExamPage;
