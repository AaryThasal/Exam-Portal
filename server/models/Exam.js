const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctAnswer: {
        type: Number,
        required: true
    }
});

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['MCQ', 'Coding'],
        default: 'MCQ'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    questions: [questionSchema],
    // Coding exam fields
    problemDescription: {
        type: String,
        default: ''
    },
    duration: {
        type: Number,
        default: 30 // minutes
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Exam', examSchema);
