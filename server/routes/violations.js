const express = require('express');
const router = express.Router();
const Violation = require('../models/Violation');

// POST /api/violations - Log a new violation
router.post('/', async (req, res) => {
    try {
        const { examId, examTitle, studentId, studentName, studentEmail, violationType } = req.body;

        const violation = new Violation({
            examId,
            examTitle,
            studentId,
            studentName,
            studentEmail,
            violationType: violationType || 'fullscreen_exit'
        });

        await violation.save();
        console.log(`[Violation] Logged: ${studentEmail} - ${violationType} on "${examTitle}"`);

        res.status(201).json(violation);
    } catch (error) {
        console.error('Log violation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/violations/aggregated - Get violations grouped by student and exam
router.get('/aggregated', async (req, res) => {
    try {
        const aggregated = await Violation.aggregate([
            {
                $group: {
                    _id: {
                        studentId: '$studentId',
                        examId: '$examId'
                    },
                    studentName: { $first: '$studentName' },
                    studentEmail: { $first: '$studentEmail' },
                    examTitle: { $first: '$examTitle' },
                    fullscreenExits: {
                        $sum: { $cond: [{ $eq: ['$violationType', 'fullscreen_exit'] }, 1, 0] }
                    },
                    tabSwitches: {
                        $sum: { $cond: [{ $eq: ['$violationType', 'tab_switch'] }, 1, 0] }
                    },
                    cameraOffs: {
                        $sum: { $cond: [{ $eq: ['$violationType', 'camera_off'] }, 1, 0] }
                    },
                    idleEvents: {
                        $sum: { $cond: [{ $eq: ['$violationType', 'idle_event'] }, 1, 0] }
                    }
                }
            },
            { $sort: { fullscreenExits: -1 } }
        ]);

        res.json({
            aggregated,
            summary: { totalStudents: aggregated.length }
        });
    } catch (error) {
        console.error('Get aggregated violations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/violations/exam/:examId - Get violations for a specific exam
router.get('/exam/:examId', async (req, res) => {
    try {
        const aggregated = await Violation.aggregate([
            { $match: { examId: new (require('mongoose').Types.ObjectId)(req.params.examId) } },
            {
                $group: {
                    _id: { studentId: '$studentId' },
                    studentName: { $first: '$studentName' },
                    studentEmail: { $first: '$studentEmail' },
                    examTitle: { $first: '$examTitle' },
                    fullscreenExits: {
                        $sum: { $cond: [{ $eq: ['$violationType', 'fullscreen_exit'] }, 1, 0] }
                    },
                    tabSwitches: {
                        $sum: { $cond: [{ $eq: ['$violationType', 'tab_switch'] }, 1, 0] }
                    },
                    cameraOffs: {
                        $sum: { $cond: [{ $eq: ['$violationType', 'camera_off'] }, 1, 0] }
                    },
                    totalViolations: { $sum: 1 }
                }
            },
            { $sort: { totalViolations: -1 } }
        ]);
        res.json(aggregated);
    } catch (error) {
        console.error('Get exam violations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
