const userModel = require('./userModel')
const bookingModel = require('./bookingModel')
const workspaceModel = require('./workspaceModel')
const workTypeModel = require('./worktypeModels')
const notificationModel = require('./notificationModel')
const paymentModel = require('./paymentModel')
const roleModel = require('./roleModel')

// Описываем связи между моделями Sequelize

// Пользователь может иметь много бронирований
userModel.hasMany(bookingModel, { foreignKey: 'user_id', as: 'bookings' })
bookingModel.belongsTo(userModel, { foreignKey: 'user_id', as: 'user' })

// Бронирование принадлежит рабочему месту
workspaceModel.hasMany(bookingModel, { foreignKey: 'workspace_id', as: 'bookings' })
bookingModel.belongsTo(workspaceModel, { foreignKey: 'workspace_id', as: 'workspace' })

// Рабочее место относится к типу рабочего места
workTypeModel.hasMany(workspaceModel, { foreignKey: 'work_type_id', as: 'workspaces' })
workspaceModel.belongsTo(workTypeModel, { foreignKey: 'work_type_id', as: 'work_type' })

// Уведомление относится к бронированию и пользователю
bookingModel.hasMany(notificationModel, { foreignKey: 'booking_id', as: 'notifications' })
notificationModel.belongsTo(bookingModel, { foreignKey: 'booking_id', as: 'booking' })
userModel.hasMany(notificationModel, { foreignKey: 'user_id', as: 'notifications' })
notificationModel.belongsTo(userModel, { foreignKey: 'user_id', as: 'user' })

// Платеж относится к бронированию и пользователю
bookingModel.hasMany(paymentModel, { foreignKey: 'booking_id', as: 'payments' })
paymentModel.belongsTo(bookingModel, { foreignKey: 'booking_id', as: 'booking' })
userModel.hasMany(paymentModel, { foreignKey: 'user_id', as: 'payments' })
paymentModel.belongsTo(userModel, { foreignKey: 'user_id', as: 'user' })

module.exports = {
  userModel,
  bookingModel,
  workspaceModel,
  workTypeModel,
  notificationModel,
  paymentModel,
  roleModel
}
