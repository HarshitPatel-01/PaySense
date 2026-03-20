const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const User = require('../models/User');
const { generateAdvisorSuggestions } = require('../services/advisorService');
const { logError } = require('../utils/logger');

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

        const activeUser = await User.findById(userId);
        const monthlyExpense = monthlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const totalBalance = (activeUser.initial_balance || 250000) - monthlyExpense;

        const activeBudgets = await Budget.countDocuments({ user_id: userId, month, year });
        const analysis = await generateAdvisorSuggestions(userId);
        const suggestions = analysis.insights;

        // Generate chart data for the last 7 days
        const chartLabels7 = [];
        const chartData7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            chartLabels7.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const dayStart = new Date(d.setHours(0,0,0,0));
            const dayEnd = new Date(d.setHours(23,59,59,999));
            
            const dayTotal = monthlyTransactions
                .filter(tx => tx.date >= dayStart && tx.date <= dayEnd)
                .reduce((sum, tx) => sum + tx.amount, 0);
                
            chartData7.push(dayTotal);
        }

        // Generate chart data for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        const thirtyDayTransactions = await Transaction.find({
            user_id: userId,
            date: { $gte: new Date(thirtyDaysAgo.setHours(0,0,0,0)) }
        });

        const chartLabels30 = [];
        const chartData30 = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            chartLabels30.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
            
            const dayStart = new Date(d.setHours(0,0,0,0));
            const dayEnd = new Date(d.setHours(23,59,59,999));
            
            const dayTotal = thirtyDayTransactions
                .filter(tx => tx.date >= dayStart && tx.date <= dayEnd)
                .reduce((sum, tx) => sum + tx.amount, 0);
                
            chartData30.push(dayTotal);
        }

        res.render('layout', {
            view: 'index',
            title: 'Dashboard',
            user: req.session.user,
            stats: { totalBalance, monthlyExpense, activeBudgets },
            transactions,
            suggestions,
            chartLabels7,
            chartData7,
            chartLabels30,
            chartData30
        });

    } catch (err) {
        logError("DASHBOARD ERROR", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
