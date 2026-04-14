const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const worktypes = require('./worktypeModels')

const workspace = sequelize.define('workspace',{
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    work_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references:{
        model: worktypes,
        key: 'id'
    }
    },
    workspace_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    }
},
{
    tableName: 'workspace',
    timestamps: false
})

module.exports = workspace