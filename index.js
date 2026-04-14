const express = require('express'); //импорт фреймворка для веб-сервиса

const app = express(); // создание приложения
app.use(express.json()); // чтобы сервер понимал запросы в json

const db = require('./config/db') //экспортируем подключение

//подключение всех роутеров
const workTyperouter = require('./routes/worktypeRoutes')
const priceRouter = require('./routes/priceRoutes')
const workspaceRouter = require('./routes/workspaceRouter')
const roleRouter = require('./routes/roleRoutes')
const userRouter = require('./routes/userRoutes')
const bookingRouter = require('./routes/bookingRoutes')
const notificationRouter = require('./routes/notificationRoutes')
const paymentRouter = require('./routes/paymentRoutes')
const authRouter = require('./routes/authRoutes')
//где будут использоваться роутеры
app.use('/api', authRouter, workspaceRouter, workTyperouter, priceRouter, roleRouter, userRouter, bookingRouter, notificationRouter, paymentRouter)

const port = 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});