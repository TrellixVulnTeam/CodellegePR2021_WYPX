const mongoose = require('mongoose');

// 
module.exports = mongoose.model('Cart', new mongoose.Schema({
    id: String,
    products: Array,
    quantity: Number,
    total: Number,
}), 'Carts');