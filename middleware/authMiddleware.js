const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next){
    try{
        const authHeader = req.headers.authorization
        if(!authHeader){
            return res.status(401).json({message: 'Нет заголовка авторизации'})
        }

        const token = authHeader.split(' ')[1]
        if(!token){
            return res.status(401).json({message: 'Токен отсутствует'})
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        req.user = decoded
        next()
    } catch(error){
        return res.status(401).json({message: 'Данные не валидные'})
    }
}

function adminMiddleware(req, res, next){
    if(!req.user || req.user.role_id !== 1){
        return res.status(403).json({message: 'Доступ только для администраторов'})
    }
    next()
}

module.exports = {authMiddleware, adminMiddleware}