require('dotenv').config()
require('dotenv').config({ path: '.env.example', override: false })

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много запросов, попробуйте позже' }
});
app.use(limiter);

const db = require('./config/db')
const models = require('./models') // Инициализация связей Sequelize
const { startScheduler } = require('./services/notificationScheduler') // Запуск фоновых задач

const workTyperouter = require('./routes/worktypeRoutes')
const priceRouter = require('./routes/priceRoutes')
const workspaceRouter = require('./routes/workspaceRouter')
const roleRouter = require('./routes/roleRoutes')
const userRouter = require('./routes/userRoutes')
const bookingRouter = require('./routes/bookingRoutes')
const notificationRouter = require('./routes/notificationRoutes')
const paymentRouter = require('./routes/paymentRoutes')
const authRouter = require('./routes/authRoutes')

app.use('/api', authRouter, workspaceRouter, workTyperouter, priceRouter, 
  roleRouter, userRouter, bookingRouter, notificationRouter, paymentRouter)

app.use((req, res) => {
  res.status(404).json({ message: 'Ресурс не найден' })
})

const port = 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
  startScheduler() // Запуск фоновых задач после запуска сервера
});
