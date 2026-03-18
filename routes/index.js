const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { generateAdvisorSuggestions } = require('../services/advisorService');
const { categorizeTransaction } = require('../services/categorizerService');
const { Categories } = require('../models/Transaction');
const fs = require('fs');
const path = require('path');

function logError(context, err) {
    const logPath = path.join(__dirname, '../debug.log');
    const msg = `[${new Date().toISOString()}] ${context}: ${err.stack || err}\n`;
    fs.appendFileSync(logPath, msg);
    console.error(msg);
}

// Dashboard
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const transactions = await Transaction.find({ user_id: userId }).sort({ date: -1 }).limit(5);
        const monthlyTransactions = await Transaction.find({
            user_id: userId,
            date: { 
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1)
            }
        });

        const monthlyExpense = monthlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const totalBalance = 250000 - monthlyExpense; // Placeholder

        const activeBudgets = await Budget.countDocuments({ user_id: userId, month, year });
        const suggestions = await generateAdvisorSuggestions(userId);

        res.render('layout', {
            view: 'index',
            title: 'Dashboard',
            user: req.session.user,
            stats: { totalBalance, monthlyExpense, activeBudgets },
            transactions,
            suggestions
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Transactions
router.get('/transactions', isAuthenticated, async (req, res) => {
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
        res.status(500).send(err.message);
    }
});

const multer = require('multer');
const { processReceipt } = require('../services/uploadService');
const upload = multer({ dest: 'uploads/' });

router.post('/transactions/add', isAuthenticated, async (req, res) => {
    try {
        let { merchant, amount, category, note } = req.body;
        if (!category) {
            category = categorizeTransaction(merchant, note);
        }
        const transaction = new Transaction({
            user_id: req.session.user.id,
            merchant,
            amount: parseFloat(amount),
            category,
            note
        });
        await transaction.save();
        res.redirect('back');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/transactions/upload', isAuthenticated, upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const { merchant, amount } = await processReceipt(req.file.path, req.file.mimetype);
        const category = categorizeTransaction(merchant);

        const transaction = new Transaction({
            user_id: req.session.user.id,
            merchant,
            amount,
            category,
            note: `Uploaded from ${req.file.originalname}`
        });

        await transaction.save();
        res.redirect('back');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/transactions/delete/:id', isAuthenticated, async (req, res) => {
    try {
        await Transaction.findOneAndDelete({ _id: req.params.id, user_id: req.session.user.id });
        res.redirect('back');
    } catch (err) {
        logError("DELETE TRANSACTION ERROR", err);
        res.status(500).send(err.message);
    }
});

// Budgets
router.get('/budgets', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const budgets = await Budget.find({ user_id: userId, month, year }).lean();
        
        // Calculate spent for each budget
        for (let budget of budgets) {
            const txs = await Transaction.find({
                user_id: userId,
                category: budget.category,
                date: {
                    $gte: new Date(year, month - 1, 1),
                    $lt: new Date(year, month, 1)
                }
            });
            budget.spent = txs.reduce((sum, tx) => sum + tx.amount, 0);
        }

        res.render('layout', { 
            view: 'budgets',
            title: 'Budgets', 
            user: req.session.user, 
            budgets,
            Categories
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/budgets/add', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const now = new Date();
        const { category, monthly_limit } = req.body;
        
        // Upsert budget
        await Budget.findOneAndUpdate(
            { user_id: userId, category, month: now.getMonth() + 1, year: now.getFullYear() },
            { monthly_limit: parseFloat(monthly_limit) },
            { upsert: true, new: true }
        );
        res.redirect('/budgets');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/budgets/delete/:id', isAuthenticated, async (req, res) => {
    try {
        await Budget.findOneAndDelete({ _id: req.params.id, user_id: req.session.user.id });
        res.redirect('/budgets');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Advisor
router.get('/advisor', isAuthenticated, async (req, res) => {
    try {
        const suggestions = await generateAdvisorSuggestions(req.session.user.id);
        res.render('layout', { 
            view: 'advisor',
            title: 'AI Advisor', 
            user: req.session.user,
            suggestions 
        });
    } catch (err) {
        logError("ADVISOR ERROR", err);
        res.status(500).send(err.message);
    }
});

module.exports = router;
