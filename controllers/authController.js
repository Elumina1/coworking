const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const userModel = require('../models/userModel')


class AuthController{
    async register(req, res){
        try{
            const { email, password, full_name, second_name } = req.body
            let role_id = 1

            if(!email || !password || !full_name || !second_name){
                return res.status(400).json({message: 'заполните все поля'})
            }
            
            const checkEmail = await userModel.findOne({where: {email}})
            if(checkEmail){
                return res.status(400).json({message: 'Email занят'})
            }

            const hashedPassword = await bcrypt.hash(password, 10)

            const newUser = await userModel.create({
                email,
                password: hashedPassword,
                full_name,
                second_name,
                role_id
            })

            //выдаем токен доступа
            const token = jwt.sign(
                {
                    id: newUser.id,
                    email: newUser.email,
                    role_id: newUser.role_id
                },
                process.env.JWT_SECRET_KEY,
                {
                expiresIn: process.env.JWT_EXPIRES || '24h'
                }
            )

            return res.status(201).json({
                message: 'Регистрация успешна',
                token,
                user:{
                    id: newUser.id,
                    email: newUser.email,
                    full_name: newUser.full_name,
                    second_name: newUser.second_name,
                    role_id: newUser.role_id
                }
            })
        }catch(error){
            return res.status(500).json({message: 'Ошибка сервера', error})
        }
    }
    async login (req, res){
            try{
                const {email, password} = req.body
                //проверка на заполненные поля
                if(!email || !password){
                    return res.status(400).json({message: 'Заполните поля'})
                }

                //проверка существования пользователя по почте
                const user = await userModel.findOne({where: {email}})
                if (!user){
                    return res.status(401).json({message: 'пользователь не найден'})
                }

                //проверка пароля
                const userPassword = await bcrypt.compare(password, user.password)
                if(!userPassword){
                    return res.status(401).json({message: 'Неверный пароль'})
                }

                //создаем и выдаем токен доступа
                const token = jwt.sign({
                    id: user.id,
                    email: user.email,
                    role_id: user.role_id
                },
                process.env.JWT_SECRET_KEY,
                {
                    expiresIn: process.env.JWT_EXPIRES || '24h'
                }
                )
                
                return res.status(200).json({
                    message: 'вход выполнен',
                    token,
                    user:{
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name,
                        second_name: user.second_name,
                        role_id: user.role_id
                    }
                })
            }catch(error){
                return res.status(500).json({message: 'Ошибка сервера', error})
            }
        }
}

module.exports = AuthController