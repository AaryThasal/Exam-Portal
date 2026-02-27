const express = require('express');
const router = express.Router();
const ExamSession = require('../models/ExamSession');

// POST /api/sessions - Save a new exam session
router.post('/', async (req, res) => {
    try {
        const session = new ExamSession(req.body);
        await session.save();
        console.log(`[Session] Saved: ${req.body.studentEmail} - "${req.body.examTitle}"`);
        res.status(201).json(session);
    } catch (error) {
        console.error('Save session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/sessions - Get all sessions (for admin dashboard)
router.get('/', async (req, res) => {
    try {
        const sessions = await ExamSession.find().sort({ createdAt: -1 });
        res.json(sessions);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/sessions/exam/:examId - Get sessions for a specific exam
router.get('/exam/:examId', async (req, res) => {
    try {
        const sessions = await ExamSession.find({ examId: req.params.examId }).sort({ createdAt: -1 });
        res.json(sessions);
    } catch (error) {
        console.error('Get sessions by exam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/sessions/:id - Get a single session by ID
router.get('/:id', async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }
        res.json(session);
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
