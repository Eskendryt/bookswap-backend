// backend/models/Swap.js
const mongoose = require('mongoose');

const swapSchema = new mongoose.Schema({
    bookOffered: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    bookRequested: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    offeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
    },
}, { timestamps: true });

module.exports = mongoose.model('Swap', swapSchema);
