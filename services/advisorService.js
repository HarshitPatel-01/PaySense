const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

/**
 * Advanced Financial Advisor Logic
 * 1. Aggregates data & fetches budgets
 * 2. Generates category table (spent vs budget vs status)
 * 3. Detects patterns (weekends, frequent categories)
 * 4. Predicts monthly total based on current pace
 * 5. Returns structured JSON ready for UI rendering
 */
async function generateAdvisorSuggestions(userId) {
    try {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // 1. Fetch Transactions & Budgets
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 1);
        
        const [transactions, budgets] = await Promise.all([
            Transaction.find({ user_id: userId, date: { $gte: start, $lt: end } }),
            Budget.find({ user_id: userId, month: currentMonth, year: currentYear })
        ]);

        if (transactions.length === 0) {
            return {
                summary: { total: 0, highestCategory: "N/A", budgetUsagePct: 0 },
                table: [],
                insights: [{ type: "summary", category: "N/A", message: "Start tracking to get AI insights!" }],
                prediction: { estimated: 0, message: "Add transactions to see your monthly forecast." },
                recommendations: [],
                behavioral: []
            };
        }

        // 2. Aggregation & Frequency Logic
        const categoryMap = {};
        const frequencyMap = {};
        let totalSpent = 0;
        let weekendSpent = 0;
        
        transactions.forEach(tx => {
            categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
            frequencyMap[tx.category] = (frequencyMap[tx.category] || 0) + 1;
            totalSpent += tx.amount;
            
            const dayOfWeek = new Date(tx.date).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) { weekendSpent += tx.amount; }
        });

        // 3. Behavioral Pattern Detection (Requirement for Saving Habits)
        const behavioral = [];
        Object.keys(frequencyMap).forEach(cat => {
            const count = frequencyMap[cat];
            const total = categoryMap[cat];
            const avg = total / count;

            if (count > 8) { // High frequency (e.g., >2 times a week)
                behavioral.push({
                    habit: `High-frequency spending in ${cat}`,
                    frequency: `${count} times this month`,
                    action: `Reduce ${cat} frequency by 25% (e.g., skip 2 orders/week)`,
                    potentialSavings: Math.round(total * 0.25),
                    type: 'frequency'
                });
            }

            if (avg < 500 && count > 5) { // Micro-spending pattern
                behavioral.push({
                    habit: `Small recurring leaks in ${cat}`,
                    frequency: `${count} small transactions`,
                    action: `Try consolidation: pay for ${cat} monthly or buy in bulk to avoid small daily outflows.`,
                    potentialSavings: Math.round(total * 0.15),
                    type: 'leak'
                });
            }
        });

        // 4. Intelligence Table
        const categoryTable = budgets.map(b => {
            const spent = categoryMap[b.category] || 0;
            const pctUsed = b.monthly_limit > 0 ? (spent / b.monthly_limit * 100) : 0;
            return {
                category: b.category,
                spent,
                budget: b.monthly_limit,
                pctUsed: Math.round(pctUsed),
                status: pctUsed > 100 ? "Exceeded" : (pctUsed > 80 ? "Warning" : "On Track")
            };
        });

        // 5. Prediction & Recommendations (Existing Logic Optimized)
        const dailyAvg = totalSpent / currentDay;
        const recommendations = [];
        [...new Set([...Object.keys(categoryMap), ...budgets.map(b => b.category)])].forEach(cat => {
            const spent = categoryMap[cat] || 0;
            const budget = budgets.find(b => b.category === cat);
            const currentLimit = budget ? budget.monthly_limit : 0;
            if (spent > 0) {
                if (!budget) {
                    recommendations.push({ category: cat, recommendedBudget: Math.round(spent * 0.9), why: "No budget set. Limit current growth.", savingsPotential: Math.round(spent * 0.1) });
                } else if (spent > currentLimit) {
                    recommendations.push({ category: cat, recommendedBudget: Math.round((spent + currentLimit) / 2), why: "Address overspending.", savingsPotential: Math.round(spent - (spent + currentLimit) / 2) });
                }
            }
        });

        // 6. Insights
        const topCat = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0][0];
        const insights = [{ type: "summary", category: "Overview", message: `Total: ₹${totalSpent.toLocaleString()}, Top Cat: ${topCat}.` }];
        
        const weekendPct = (weekendSpent / totalSpent) * 100;
        if (weekendPct > 55) {
            insights.push({ type: "trend", category: "Weekend Impact", message: `Weekend spending is high (${Math.round(weekendPct)}%). A weekend 'spend-fast' could save you ₹${Math.round(weekendSpent * 0.2).toLocaleString()} monthly.` });
        }

        return {
            summary: { total: totalSpent, highestCategory: topCat, budgetUsagePct: budgets.length > 0 ? Math.round((totalSpent / budgets.reduce((s, b) => s + b.monthly_limit, 0)) * 100) : 0 },
            table: categoryTable,
            insights,
            prediction: { estimated: Math.round(dailyAvg * daysInMonth), message: `Estimated total: ₹${Math.round(dailyAvg * daysInMonth).toLocaleString()} by EOF.` },
            recommendations: recommendations.sort((a,b) => b.savingsPotential - a.savingsPotential).slice(0, 3),
            behavioral: behavioral.sort((a,b) => b.potentialSavings - a.potentialSavings).slice(0, 3)
        };

    } catch (err) {
        console.error("[AI Advisor] Analysis Error:", err);
        throw err;
    }
}

module.exports = { generateAdvisorSuggestions };

async function fetchMonthlyTransactions(userId, month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return await Transaction.find({ user_id: userId, date: { $gte: start, $lt: end } });
}

function aggregateData(txs) {
    const categoryMap = {};
    let total = 0;
    txs.forEach(tx => {
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
        total += tx.amount;
    });
    return { categoryMap, total };
}

module.exports = { generateAdvisorSuggestions };
