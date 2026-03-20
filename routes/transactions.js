const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const { categorizeTransaction } = require('../services/categorizerService');
const { Categories } = require('../models/Transaction');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const { processReceipt } = require('../services/uploadService');
const { logError } = require('../utils/logger');

// ---------------------------
// TRANSACTIONS PAGE
// ---------------------------
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user_id: req.session.user.id }).sort({ date: -1 });
        res.render('layout', { 
            view: 'transactions',
            title: 'Transactions', 
            user: req.session.user, 
            transactions,
            Categories 
        });
    } catch (err) {
        logError("FETCH TRANSACTIONS ERROR", err);
        res.status(500).send(err.message);
    }
});

// ---------------------------
// ADD TRANSACTION (MANUAL)
// ---------------------------
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        let { merchant, amount, category, note } = req.body;
        if (!amount) return res.status(400).send("Amount not provided");

        if (!category) {
            category = categorizeTransaction(merchant, note);
        }

        const transaction = new Transaction({
            user_id: req.session.user.id,
            merchant: merchant || "Unknown",
            amount: parseFloat(amount),
            category,
            note
        });

        await transaction.save();
        res.redirect('/transactions');

    } catch (err) {
        logError("ADD TRANSACTION ERROR", err);
        res.status(500).send(err.message);
    }
});

// ---------------------------
// UPLOAD RECEIPT (OCR)
// ---------------------------
router.post('/upload', isAuthenticated, upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("No receipt file provided");

        const filePath = req.file.path;
        const mimeType = req.file.mimetype;
        const { merchant, amount } = await processReceipt(filePath, mimeType);

        if (!amount) {
            fs.unlinkSync(filePath); // Cleanup on fail
            return res.status(400).send("Could not detect amounts from receipt. Try manual entry.");
        }

        const note = `OCR Upload: ${req.file.originalname}`;
        const category = categorizeTransaction(merchant, note);

        const transaction = new Transaction({
            user_id: req.session.user.id,
            merchant: merchant || "Scanned Receipt",
            amount: parseFloat(amount),
            category,
            note
        });

        await transaction.save();
        fs.unlinkSync(filePath); // Delete local file after saving
        
        res.redirect('/transactions');
    } catch (err) {
        logError("UPLOAD OCR ERROR", err);
        res.status(500).send(err.message);
    }
});

// ---------------------------
// DELETE TRANSACTION
// ---------------------------
router.post('/delete/:id', isAuthenticated, async (req, res) => {
    try {
        await Transaction.findOneAndDelete({
            _id: req.params.id,
            user_id: req.session.user.id
        });
        res.redirect(req.get('Referrer') || '/transactions');
    } catch (err) {
        logError("DELETE TRANSACTION ERROR", err);
        res.status(500).send(err.message);
    }
});

module.exports = router;
