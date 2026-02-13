const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const User = require('../models/User');

// GET /api/exams - Get all exams
router.get('/', async (req, res) => {
    try {
        const exams = await Exam.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(exams);
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/exams/:id - Get exam by ID
router.get('/:id', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        res.json(exam);
    } catch (error) {
        console.error('Get exam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/exams - Create new exam
router.post('/', async (req, res) => {
    try {
        const { title, type, createdBy, questions, duration } = req.body;

        // Verify admin exists
        const admin = await User.findById(createdBy);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can create exams' });
        }

        const exam = new Exam({
            title,
            type: type || 'MCQ',
            createdBy,
            questions: questions || [],
            duration: duration || 30
        });

        await exam.save();

        const populatedExam = await Exam.findById(exam._id)
            .populate('createdBy', 'name email');

        res.status(201).json(populatedExam);
    } catch (error) {
        console.error('Create exam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/exams/:id - Delete exam
router.delete('/:id', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        await Exam.findByIdAndDelete(req.params.id);
        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
