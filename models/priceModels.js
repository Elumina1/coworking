const { DataTypes, DECIMAL } = require('sequelize');
const sequelize = require('../config/db');
const worktypesModel = require('./worktypeModels');

const price = sequelize.define('price', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    work_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: worktypesModel,
            key: 'id'
        }
    },
    price_day: {
        type: DECIMAL(10, 2),
        allowNull: false
    },
    effective_from: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Дата начала действия цены'
    }
}, {
    tableName: 'price',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['work_type_id', 'effective_from']
        }
    ]
});

module.exports = price;