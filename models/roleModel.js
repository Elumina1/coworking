const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const role = sequelize.define('role',{
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    role_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    }
},
{
    tableName: 'roles',
    timestamps: false
})

module.exports = role