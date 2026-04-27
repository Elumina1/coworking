const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const paymentStatus = sequelize.define('payment_status', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'payment_statuses',
  timestamps: false
})

module.exports = paymentStatus
