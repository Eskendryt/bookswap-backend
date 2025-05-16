// Load environment variables from .env
require('dotenv').config({ path: './backend/.env' });
console.log('🔍 Loaded MONGO_URI:', process.env.MONGO_URI);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes'); // ✅ Now using routes
const swapRoutes = require('./routes/swapRoutes'); // 🔁 Swap routes

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Serve uploads from the new location: backend/uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Ensure backend/uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('✅ MongoDB connected');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// Routes
app.use('/api/auth', authRoutes);     // 🛂 Authentication
app.use('/api/books', bookRoutes);    // 📚 Book CRUD + Upload
app.use('/api/swaps', swapRoutes);    // 🔁 Swap functionality
app.use('/api/users', userRoutes);    // 👤 User profile/details

// Root route
app.get('/', (req, res) => {
    res.send('📚 Book Swap API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
