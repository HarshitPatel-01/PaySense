const mongoose = require('mongoose');

const Categories = [
    "Food", "Travel", "Shopping", "Entertainment", 
    "Bills & Utilities", "Healthcare", "Education", 
    "Groceries", "Fuel", "Others"
];

const transactionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    merchant: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    category: {
        type: String,
        enum: Categories,
        default: "Others"
    },
    note: {
        type: String,
        trim: true,
        maxlength: 255
    },
    upi_id: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.Categories = Categories;
