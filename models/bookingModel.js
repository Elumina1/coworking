const { DataTypes, DECIMAL } = require('sequelize');
const sequelize = require('../config/db');
const userModel = require('./userModel')
const workspaceModel = require('./workspaceModel')

const booking = sequelize.define('booking',{
    id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  user_id:{
    type: DataTypes.INTEGER,
    allowNull: false,
    references:{
        model: userModel,
        key: "id"
    }
  },
  workspace_id:{
    type: DataTypes.INTEGER,
    allowNull: false,
    references:{
        model: workspaceModel,
        key: "id"
    }
  },
  start_date:{
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date:{
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  total_price:{
    type: DECIMAL(10,2),
    allowNull: true,
    defaultValue: null,
    comment: 'Итоговая цена (price_per_day * количество дней)'
  },
  price_per_day:{
    type: DECIMAL(10,2),
    allowNull: false,
    comment: 'Цена за день на момент бронирования (снапшот)'
  },
  booking_status: {
  type: DataTypes.STRING(20),
  allowNull: false,
  defaultValue: 'pending'
}
},{
    tableName: 'booking',
    timestamps: false
})

module.exports = booking;
