require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Exam = require('../models/Exam');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Exam.deleteMany({});
        console.log('Cleared existing data');

        // Create demo users
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@exam.com',
            password: 'admin123',
            role: 'admin'
        });

        const student = await User.create({
            name: 'Student User',
            email: 'student@exam.com',
            password: 'student123',
            role: 'student'
        });

        console.log('Created demo users:');
        console.log('  Admin: admin@exam.com / admin123');
        console.log('  Student: student@exam.com / student123');

        // Create demo exam
        const exam = await Exam.create({
            title: 'Introduction to Programming',
            type: 'MCQ',
            createdBy: admin._id,
            duration: 30,
            questions: [
                {
                    questionText: 'What does HTML stand for?',
                    options: [
                        'Hyper Text Markup Language',
                        'High Tech Modern Language',
                        'Hyper Transfer Markup Language',
                        'Home Tool Markup Language'
                    ],
                    correctAnswer: 0
                },
                {
                    questionText: 'Which of the following is a JavaScript framework?',
                    options: [
                        'Django',
                        'React',
                        'Laravel',
                        'Flask'
                    ],
                    correctAnswer: 1
                },
                {
                    questionText: 'What is the correct syntax to print "Hello World" in Python?',
                    options: [
                        'echo("Hello World")',
                        'console.log("Hello World")',
                        'print("Hello World")',
                        'printf("Hello World")'
                    ],
                    correctAnswer: 2
                }
            ]
        });

        console.log(`Created demo exam: "${exam.title}"`);
        console.log('\nSeed completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedData();
