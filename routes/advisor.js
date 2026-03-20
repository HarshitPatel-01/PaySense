const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { generateAdvisorSuggestions } = require('../services/advisorService');
const { logError } = require('../utils/logger');

// ---------------------------
// ADVISOR
// ---------------------------
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const analysis = await generateAdvisorSuggestions(req.session.user.id);

        res.render('layout', { 
            view: 'advisor',
            title: 'AI Advisor', 
            user: req.session.user,
            ...analysis
        });

    } catch (err) {
        logError("ADVISOR ERROR", err);
        res.status(500).send(err.message);
    }
});

module.exports = router;
