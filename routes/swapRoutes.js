// backend/routes/bookRoutes.js
const express = require('express');
const router = express.Router();
const Swap = require('../models/Swap');
const Book = require('../models/Book');
const authMiddleware = require('../middleware/verifyToken');

// ➕ Create a new swap
router.post('/create', authMiddleware, async (req, res) => {
    const { bookRequestedId, bookOfferedId } = req.body;

    console.log('📩 Swap create request:', { bookRequestedId, bookOfferedId, userId: req.userId });

    if (!bookRequestedId || !bookOfferedId) {
        return res.status(400).json({ error: 'Both offered and requested book IDs are required' });
    }

    try {
        const requestedBook = await Book.findById(bookRequestedId);
        const offeredBook = await Book.findById(bookOfferedId);

        console.log('🔍 Requested book:', requestedBook);
        console.log('🔍 Offered book:', offeredBook);

        if (!requestedBook || !offeredBook) {
            return res.status(404).json({ error: 'One or both books not found' });
        }

        if (requestedBook.owner.toString() === req.userId) {
            return res.status(400).json({ error: 'You cannot request your own book' });
        }

        if (offeredBook.owner.toString() !== req.userId) {
            return res.status(403).json({ error: 'You do not own the offered book' });
        }

        const newSwap = new Swap({
            bookRequested: bookRequestedId,
            bookOffered: bookOfferedId,
            requestedFrom: requestedBook.owner,
            offeredBy: req.userId,
        });

        console.log('📦 New swap:', newSwap);

        const saved = await newSwap.save();
        console.log('✅ Swap saved:', saved);
        res.status(201).json(saved);
    } catch (err) {
        console.error('❌ Swap creation failed:', err);
        res.status(500).json({ error: 'Server error creating swap' });
    }
});

// 📥 Get swaps where user is the owner of requested book
router.get('/received', authMiddleware, async (req, res) => {
    try {
        const swaps = await Swap.find({ requestedFrom: req.userId })
            .populate('bookRequested')
            .populate('bookOffered')
            .populate('offeredBy', 'full_name _id')
            .populate('requestedFrom', 'full_name _id');

        res.json(swaps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch received swaps' });
    }
});

// 📤 Get swaps where user is the one offering
router.get('/sent', authMiddleware, async (req, res) => {
    try {
        const swaps = await Swap.find({ offeredBy: req.userId })
            .populate('bookRequested')
            .populate('bookOffered')
            .populate('offeredBy', 'full_name _id')
            .populate('requestedFrom', 'full_name _id');

        res.json(swaps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sent swaps' });
    }
});

// 🔁 Update status of a swap (accept/reject)
router.patch('/:id/status', authMiddleware, async (req, res) => {
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    try {
        const swap = await Swap.findById(req.params.id)
            .populate('bookRequested');

        if (!swap) return res.status(404).json({ error: 'Swap not found' });

        // Only the owner of the requested book can accept/reject
        if (swap.requestedFrom.toString() !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to update this swap' });
        }

        swap.status = status;
        const updated = await swap.save();
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update swap status' });
    }
});

// 🗑️ Optional: Delete a swap (if rejected or canceled)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const swap = await Swap.findById(req.params.id);

        if (!swap) return res.status(404).json({ error: 'Swap not found' });

        // Only allow deletion if you are involved
        if (
            swap.offeredBy.toString() !== req.userId &&
            swap.requestedFrom.toString() !== req.userId
        ) {
            return res.status(403).json({ error: 'Not authorized to delete this swap' });
        }

        await swap.deleteOne();
        res.json({ message: 'Swap deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete swap' });
    }
});

module.exports = router;
