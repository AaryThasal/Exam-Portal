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
import { monitorFaceDetection } from '../utils/faceDetection';
import '../styles/CodingExamPage.css';

function CodingExamPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [examStarted, setExamStarted] = useState(false);
    const [examSubmitted, setExamSubmitted] = useState(false);
    const [code, setCode] = useState('');
    const [fullscreenViolations, setFullscreenViolations] = useState(0);
    const [tabViolations, setTabViolations] = useState(0);
    const [cameraInterruptions, setCameraInterruptions] = useState(0);
    const [cameraStream, setCameraStream] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isBlurred, setIsBlurred] = useState(false);
    const [faceNotDetected, setFaceNotDetected] = useState(0);
    const [autoSubmitReason, setAutoSubmitReason] = useState('');
    const violationsLogged = useRef(new Set());
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

    // Disable copying of problem description, right-click, but allow typing in code editor
    useEffect(() => {
        if (!examStarted || examSubmitted) return;

        const blockContextMenu = (e) => e.preventDefault();
        const blockKeyCombo = (e) => {
            // Allow normal typing in code editor
            const isCodeEditor = e.target.classList.contains('code-editor-textarea');
            if (isCodeEditor) {
                // Only block Ctrl+A (select all) on the whole page - allow copy/paste within editor
                // Block Ctrl+S, Ctrl+P
                if ((e.ctrlKey || e.metaKey) && ['s', 'p'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }
                return;
            }
            // Block Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+U, Ctrl+S, Ctrl+P on non-editor elements
            if ((e.ctrlKey || e.metaKey) && ['c', 'a', 'x', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
            if (e.key === 'PrintScreen') {
                e.preventDefault();
            }
        };
        const blockCopy = (e) => {
            // Allow copy only inside the code editor
            if (!e.target.classList.contains('code-editor-textarea')) {
                e.preventDefault();
            }
        };
        const blockSelect = (e) => {
            // Allow text selection only inside code editor
            if (!e.target.classList.contains('code-editor-textarea')) {
                e.preventDefault();
            }
        };
        const blockDragStart = (e) => e.preventDefault();

        document.addEventListener('copy', blockCopy);
        document.addEventListener('cut', blockCopy);
        document.addEventListener('contextmenu', blockContextMenu);
        document.addEventListener('keydown', blockKeyCombo);
        document.addEventListener('dragstart', blockDragStart);
        document.addEventListener('selectstart', blockSelect);

        return () => {
            document.removeEventListener('copy', blockCopy);
            document.removeEventListener('cut', blockCopy);
            document.removeEventListener('contextmenu', blockContextMenu);
            document.removeEventListener('keydown', blockKeyCombo);
            document.removeEventListener('dragstart', blockDragStart);
            document.removeEventListener('selectstart', blockSelect);
        };
    }, [examStarted, examSubmitted]);

    // Callback ref to attach camera stream
    const setCameraVideoRef = useCallback((el) => {
        videoRef.current = el;
        if (el && cameraStream) {
            el.srcObject = cameraStream;
        }
    }, [cameraStream]);

    // Stop camera on unmount
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
            if (data.type !== 'Coding') {
                navigate(`/exam/${id}`);
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
        const stream = await requestCamera();
        if (!stream) {
            alert('Camera access is required to start the exam.');
            return;
        }
        setCameraStream(stream);

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

    const handleSubmit = useCallback(async (submitReason) => {
        // Sanitize: if called from onClick, submitReason is a React event, not a string
        const reason = typeof submitReason === 'string' ? submitReason : '';
        setExamSubmitted(true);
        if (cameraStream) {
            stopCamera(cameraStream);
            setCameraStream(null);
        }

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
                idleEvents: 0,
                faceNotDetected: faceCount,
                totalViolations: fullscreenViolations + tabViolations + cameraInterruptions + faceCount,
                score: { correct: 0, total: 0 },
                examType: 'Coding',
                codeSubmission: code,
                autoSubmitReason: reason
            });
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }, [exam, code, cameraStream, user, fullscreenViolations, tabViolations, cameraInterruptions]);

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
            <div className="coding-exam-page">
                <div className="loading-spinner">Loading exam...</div>
            </div>
        );
    }

    // Pre-exam screen
    if (!examStarted) {
        return (
            <div className="coding-exam-page pre-exam">
                <div className="pre-exam-container">
                    <div className="exam-info-card">
                        <h1>{exam?.title}</h1>
                        <div className="exam-details">
                            <div className="detail-item">
                                <span className="detail-icon">💻</span>
                                <span>Coding Exam</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-icon">⏱️</span>
                                <span>{exam?.duration} Minutes</span>
                            </div>
                        </div>

                        <div className="fullscreen-warning">
                            <h3>⚠️ Important Instructions</h3>
                            <ul>
                                <li>This exam requires <strong>fullscreen mode</strong></li>
                                <li>Exiting fullscreen will be recorded as a violation</li>
                                <li><strong>Switching browser tabs is prohibited</strong></li>
                                <li>Your <strong>camera must remain on</strong> throughout the exam</li>
                                <li>Write your solution in the code editor</li>
                                <li>Problem description text cannot be copied</li>
                            </ul>
                        </div>

                        <button className="start-exam-btn" onClick={handleStartExam}>
                            🚀 Start Coding Exam
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
        return (
            <div className="coding-exam-page exam-completed">
                <div className="completion-container">
                    <div className="completion-card">
                        <div className="completion-icon">✅</div>
                        <h1>Coding Exam Completed!</h1>

                        <div className="results-summary">
                            <div className="result-item">
                                <span className="result-label">Code Submitted</span>
                                <span className="result-value">{code.length > 0 ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="result-item">
                                <span className="result-label">Lines of Code</span>
                                <span className="result-value">{code.split('\n').filter(l => l.trim()).length}</span>
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
    return (
        <div className={`coding-exam-page coding-active ${isBlurred ? 'blurred' : ''}`}>
            {/* Top Header Bar */}
            <header className="exam-header">
                <div className="exam-header-left">
                    <div className="exam-title">
                        <span className="exam-title-icon">💻</span>
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

            {/* Main Body */}
            <div className="coding-body">
                {/* Problem Description Panel */}
                <div className="problem-panel">
                    <div className="panel-header">
                        <h2>📋 Problem Description</h2>
                    </div>
                    <div className="problem-content no-select">
                        <pre className="problem-text">{exam.problemDescription}</pre>
                    </div>
                </div>

                {/* Code Editor Panel */}
                <div className="editor-panel">
                    <div className="panel-header">
                        <h2>✏️ Code Editor</h2>
                        <span className="line-count">{code.split('\n').length} line{code.split('\n').length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="editor-wrapper">
                        <textarea
                            className="code-editor-textarea"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Write your code here..."
                            spellCheck={false}
                            autoCapitalize="off"
                            autoCorrect="off"
                        />
                    </div>
                    <div className="editor-footer">
                        <button className="submit-code-btn" onClick={handleSubmit}>
                            ✓ Submit Code
                        </button>
                    </div>
                </div>
            </div>

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

export default CodingExamPage;
