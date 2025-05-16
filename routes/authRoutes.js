// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile } = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');  // Middleware to verify token

// User registration and login routes
router.post('/register', register);
router.post('/login', login);

// Profile route (fetch profile details)
router.get('/profile', verifyToken, getProfile);  // Protected route to get user profile

// Profile update route (save profile changes)
router.put('/profile', verifyToken, updateProfile);  // Protected route to update profile

module.exports = router;
