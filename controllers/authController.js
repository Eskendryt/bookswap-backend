// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ Register new user
exports.register = async (req, res) => {
    try {
        const { full_name, email, phone_number, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            full_name,
            email,
            phone_number,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ✅ User login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // 👇 Create a token with { userId } to match your middleware
        const token = jwt.sign(
            { id: user._id }, // ✅ new
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );


        res.json({
            token,
            user: {
                id: user._id,
                full_name: user.full_name,
                email: user.email
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ✅ Get profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.userId;  // Comes from verifyToken middleware

        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            user: {
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ✅ Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { full_name, email, phone_number } = req.body;
        const userId = req.userId;  // Comes from verifyToken middleware

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { full_name, email, phone_number },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
