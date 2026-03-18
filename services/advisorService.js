const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

async function generateAdvisorSuggestions(userId) {
    console.log(`[AI Advisor] Generating suggestions for user: ${userId}`);
    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        console.log(`[AI Advisor] Current Month: ${currentMonth}, Prev Month: ${prevMonth}`);

        const [currentTxs, prevTxs] = await Promise.all([
            fetchMonthlyTransactions(userId, currentMonth, currentYear),
            fetchMonthlyTransactions(userId, prevMonth, prevYear)
        ]);

        console.log(`[AI Advisor] Found ${currentTxs.length} txs for current, ${prevTxs.length} for prev.`);

        if (currentTxs.length === 0) {
            return [{
                category: "General",
                suggestion: "You haven't tracked any transactions this month yet. Start now to get personalized AI insights!",
                type: "info"
            }];
        }

        const currentStats = analyzeTransactions(currentTxs);
        const prevStats = analyzeTransactions(prevTxs);
        const budgets = await fetchBudgets(userId, currentMonth, currentYear);

        const suggestions = [];

        // Trend Analysis
        for (const [cat, currentTotal] of Object.entries(currentStats.categoryTotals)) {
            const prevTotal = prevStats.categoryTotals[cat] || 0;
            if (prevTotal > 0) {
                const diff = ((currentTotal - prevTotal) / prevTotal) * 100;
                if (diff > 20) {
                    suggestions.push({
                        category: cat,
                        suggestion: `Your ${cat} spending is up by ${Math.round(diff)}% this month.`,
                        type: "warning",
                        trend: `+${Math.round(diff)}%`
                    });
                }
            }
        }

        // Anomaly Detection
        if (currentTxs.length > 0) {
            const avgTxAmount = currentStats.totalSpent / currentTxs.length;
            currentTxs.forEach(tx => {
                if (tx.amount > avgTxAmount * 5 && tx.amount > 1000) {
                    suggestions.push({
                        category: "Spending Spike",
                        suggestion: `High transaction at ${tx.merchant} (₹${tx.amount.toLocaleString()}).`,
                        type: "alert"
                    });
                }
            });
        }

        // Default
        if (suggestions.length === 0) {
            suggestions.push({
                category: "Analysis Complete",
                suggestion: "Your financial patterns look stable. Add more transactions to see deeper trends!",
                type: "success"
            });
        }

        return suggestions;
    } catch (err) {
        console.error("[AI Advisor] CRITICAL ERROR:", err);
        return [{
            category: "Error",
            suggestion: "The AI Advisor encountered an issue while analyzing your data. Please try again later.",
            type: "danger"
        }];
    }
}

async function fetchMonthlyTransactions(userId, month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return await Transaction.find({ user_id: userId, date: { $gte: start, $lt: end } });
}

function analyzeTransactions(txs) {
    const categoryTotals = txs.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
    }, {});
    const totalSpent = txs.reduce((sum, tx) => sum + tx.amount, 0);
    return { categoryTotals, totalSpent };
}

async function fetchBudgets(userId, month, year) {
    return await Budget.find({ user_id: userId, month, year });
}

module.exports = { generateAdvisorSuggestions };
