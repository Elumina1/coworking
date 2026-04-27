const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const notificationStatus = sequelize.define('notification_status', {
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
  tableName: 'notification_statuses',
  timestamps: false
})

module.exports = notificationStatus
