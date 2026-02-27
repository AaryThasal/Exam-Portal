const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    examTitle: {
        type: String,
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    studentEmail: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    fullscreenExits: {
        type: Number,
        default: 0
    },
    tabSwitches: {
        type: Number,
        default: 0
    },
    cameraOffs: {
        type: Number,
        default: 0
    },
    idleEvents: {
        type: Number,
        default: 0
    },
    totalViolations: {
        type: Number,
        default: 0
    },
    score: {
        correct: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    examType: {
        type: String,
        enum: ['MCQ', 'Coding'],
        default: 'MCQ'
    },
    codeSubmission: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ExamSession', examSessionSchema);
