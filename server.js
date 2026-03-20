const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { Categories } = require('./models/Transaction');

dotenv.config();

const app = express();
app.locals.Categories = Categories;
const PORT = process.env.PORT || 3000;

// Database Connection

mongoose.connect(
    process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/paysense'
)
.then(() => console.log(`Connected to MongoDB (${process.env.NODE_ENV || "dev"})`))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'paysense_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const transactionsRoutes = require('./routes/transactions');
const budgetsRoutes = require('./routes/budgets');
const advisorRoutes = require('./routes/advisor');
const settingsRoutes = require('./routes/settings');

app.use('/auth', authRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/budgets', budgetsRoutes);
app.use('/advisor', advisorRoutes);
app.use('/settings', settingsRoutes);
app.use('/', dashboardRoutes);

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
