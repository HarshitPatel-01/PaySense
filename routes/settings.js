const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const { logError } = require('../utils/logger');

// ---------------------------
// SETTINGS
// ---------------------------
router.post('/balance', isAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.session.user.id, {
            initial_balance: parseFloat(req.body.initial_balance)
        });
        res.redirect('/');
    } catch (err) {
        logError("UPDATE BALANCE ERROR", err);
        res.status(500).send(err.message);
    }
});

module.exports = router;
