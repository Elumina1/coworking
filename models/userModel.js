const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const role = require('./roleModel')

const user = sequelize.define('user',{
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: role,
            key: 'id'
        }
    },
    full_name: {
        type: DataTypes.STRING(50),
        allowNull:false,
    },
    second_name: {
        type: DataTypes.STRING(50),
        allowNull:false,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull:false,
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull:false,
    }
},{
    tableName: 'users',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['email']
        }
    ]
})

module.exports = user;