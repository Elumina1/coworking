const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const bookingStatus = sequelize.define('booking_status', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'booking_statuses',
  timestamps: false
})

module.exports = bookingStatus
