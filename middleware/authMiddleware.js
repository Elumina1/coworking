const jwt = require('jsonwebtoken')

function authMidlleware(req, res, next){
    try{
        //берем токен из заголовка 
        const authHeader = req.headers.authorization

        //проверяем что заголовок существует
        if(!authHeader){
            return res.status(401).json({message: 'Нет заголовка Авторизации'})
        }

        //извлекаем токен формат bearer
        const token = authHeader.Split(' ')[1]
        
        //на случай если токена нету
        if(!token){
            res.
            status(401).json({message: 'Токен отсутствует'})
        }

        //декодируем токен и записываем данные пользователя 
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        //декодед содержит айди емайл и роль айди
        req.user = decoded

        next()
    }catch(error){
        res.status(401).json(error, {message: 'Данные не валидные'})
    }
}

function adminMidlleware(req, res, next){
        if(req.user.role_id !== 1){
            res.status(401).json({message: 'Доступ только для администраторов'})
        }
    next()
}

module.exports = {authMidlleware, adminMidlleware}