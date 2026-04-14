const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

//описание модели типа комнат как в базе данных
const worktypes = sequelize.define('work_types', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  type_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = worktypes;