const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Book = require('../models/Book');
const authMiddleware = require('../middleware/verifyToken');

// Multer setup for saving cover images to backend/uploads folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads')); // <-- updated to absolute path inside backend/uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// ➕ Add a new book (must be authenticated, with image upload)
router.post('/add', authMiddleware, upload.single('cover'), async (req, res) => {
    const { title, author, description } = req.body;

    try {
        const coverUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const newBook = new Book({
            title,
            author,
            description,
            cover: coverUrl,
            owner: req.userId // ✅ fixed: use 'owner' as per schema
            // status will default to 'available' automatically
        });

        const savedBook = await newBook.save();
        res.status(201).json(savedBook);
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(400).json({
            error: 'Failed to add book',
            details: err.message,
        });
    }
});

// 📝 Edit/update a book (only if user owns it)
// UPDATED: handle multipart/form-data with multer, delete old cover image if replaced
router.put('/update/:id', authMiddleware, upload.single('cover'), async (req, res) => {
    const { title, author, description, status } = req.body;

    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: 'Book not found' });

        if (book.owner.toString() !== req.userId) {
            return res.status(403).json({ error: 'Not allowed to edit this book' });
        }

        // Update text fields
        book.title = title || book.title;
        book.author = author || book.author;
        book.description = description || book.description;
        book.status = status || book.status;

        // Handle cover image update
        if (req.file) {
            // Delete old cover image file if it exists
            if (book.cover) {
                const oldCoverPath = path.join(__dirname, '..', book.cover);
                if (fs.existsSync(oldCoverPath)) {
                    fs.unlinkSync(oldCoverPath);
                }
            }
            // Update to new cover image path
            book.cover = `/uploads/${req.file.filename}`;
        }

        const updatedBook = await book.save();
        res.status(200).json(updatedBook);
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

// ** NEW PATCH route to update only status **
router.patch('/:id/status', authMiddleware, async (req, res) => {
    const { status } = req.body;

    if (!['available', 'swapped'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    try {
        const book = await Book.findOneAndUpdate(
            { _id: req.params.id, owner: req.userId },
            { status },
            { new: true }
        );
        if (!book) return res.status(404).json({ error: 'Book not found or not authorized' });
        res.status(200).json(book);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: 'Book not found' });

        if (book.owner.toString() !== req.userId) {
            return res.status(403).json({ error: 'Not allowed to delete this book' });
        }

        // Delete the cover image file
        if (book.cover) {
            const coverPath = path.join(__dirname, '..', book.cover);
            if (fs.existsSync(coverPath)) {
                fs.unlinkSync(coverPath);
            }
        }

        await book.deleteOne();
        res.status(200).json({ message: 'Book and cover image deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

// GET /api/books/details/:id
router.get('/details/:id', authMiddleware, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.json(book);
    } catch (err) {
        console.error('Fetch book error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 📚 Get all books
router.get('/', async (req, res) => {
    try {
        const books = await Book.find().populate('owner', 'full_name email');
        res.status(200).json(books);
    } catch (err) {
        res.status(400).json({ error: 'Failed to fetch books' });
    }
});

router.get('/available', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        const availableBooks = await Book.find({
            owner: { $ne: userId },
            status: 'available',
        });

        res.json(availableBooks);
    } catch (err) {
        console.error('Failed to fetch available books:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 👤 Get books for the authenticated user
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const books = await Book.find({ owner: req.userId });
        res.status(200).json(books);
    } catch (err) {
        res.status(400).json({ error: 'Failed to fetch your books' });
    }
});

module.exports = router;
