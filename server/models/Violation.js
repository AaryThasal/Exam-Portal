const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
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
    violationType: {
        type: String,
        enum: ['fullscreen_exit', 'tab_switch', 'camera_off', 'idle_event', 'camera_interruption'],
        default: 'fullscreen_exit'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Violation', violationSchema);
