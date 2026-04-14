const mysql2 = require('mysql2');
require('dotenv').config();
const { Sequelize } = require('sequelize');
//подключаемся к базе данных из файла .env
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql'
    }
);
//проверяем подключение базы данных и выводи это в консоль
sequelize.authenticate()
    .then(() =>console.log('Connected'))
    .catch(err => console.error('Nooooo',err));

module.exports = sequelize; //экспортируем подключение чтобы другие файлы могли подключится к бд