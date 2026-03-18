const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET Auth Page
router.get('/', (req, res) => {
    res.render('auth', { title: 'Login / Register', error: null });
});

// POST Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('auth', { title: 'Login / Register', error: 'Email already exists' });
        }
        const user = new User({ name, email, password });
        await user.save();
        req.session.user = { id: user._id, name: user.name, email: user.email };
        res.redirect('/');
    } catch (err) {
        res.render('auth', { title: 'Login / Register', error: err.message });
    }
});

// POST Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.render('auth', { title: 'Login / Register', error: 'Invalid email or password' });
        }
        req.session.user = { id: user._id, name: user.name, email: user.email };
        res.redirect('/');
    } catch (err) {
        res.render('auth', { title: 'Login / Register', error: err.message });
    }
});

// GET Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth');
});

module.exports = router;
