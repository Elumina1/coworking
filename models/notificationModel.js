const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const userModel = require('./userModel');
const bookingModel = require('./bookingModel');

const notification = sequelize.define('notifications_email', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: userModel,
            key: 'id'
        }
    },
    booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: bookingModel,
            key: 'id'
        }
    },
    subject: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'notifications_email',
    timestamps: false
});

module.exports = notification;
