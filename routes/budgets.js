const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { Categories } = require('../models/Transaction');
const { logError } = require('../utils/logger');

// ---------------------------
// BUDGETS PAGE
// ---------------------------
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const budgets = await Budget.find({ user_id: userId, month, year }).lean();

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
        logError("BUDGET ERROR", err);
        res.status(500).send(err.message);
    }
});

// ---------------------------
// ADD BUDGET
// ---------------------------
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const now = new Date();
        const { category, monthly_limit } = req.body;

        await Budget.findOneAndUpdate(
            { user_id: userId, category, month: now.getMonth() + 1, year: now.getFullYear() },
            { monthly_limit: parseFloat(monthly_limit) },
            { upsert: true, new: true }
        );

        res.redirect('/budgets');

    } catch (err) {
        logError("ADD BUDGET ERROR", err);
        res.status(500).send(err.message);
    }
});

// ---------------------------
// DELETE BUDGET
// ---------------------------
router.post('/delete/:id', isAuthenticated, async (req, res) => {
    try {
        await Budget.findOneAndDelete({
            _id: req.params.id,
            user_id: req.session.user.id
        });

        res.redirect('/budgets');

    } catch (err) {
        logError("DELETE BUDGET ERROR", err);
        res.status(500).send(err.message);
    }
});

module.exports = router;
