const { DataTypes, DECIMAL } = require('sequelize');
const sequelize = require('../config/db');
const bookingModel = require('./bookingModel');
const userModel = require('./userModel');

const payment = sequelize.define('payment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: bookingModel,
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: userModel,
            key: 'id'
        }
    },
    amount: {
        type: DECIMAL(10, 2),
        allowNull: false
    },
    external_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    receipt_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    refund_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    payment_status: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'payment',
    timestamps: false
});

module.exports = payment;
