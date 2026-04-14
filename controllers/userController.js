const userModel = require('../models/userModel');

class UserController{
    //создание нового пользователя
    async create (req, res){
        try{
            const { role_id,full_name,second_name,email,password} = req.body
            const post = await userModel.create({role_id,full_name,second_name,email,password});
            return res.json(post)
        }catch(error){
            return res.status(500).json(error)
        }
    }
    //получение списка всех пользователей
    async get (req, res){
        try{
            const posts = await userModel.findAll();
            return res.json(posts)
        }catch(error){
            return res.status(500).json(error)
        }
    }
    //обновление данных пользователя по почте
    async update (req, res){
        try{
            const {email} = req.params
            const {full_name,second_name,password} = req.body
            const update = await userModel.update({full_name,second_name,password}, {where: {email}});
            return res.json(update)
        }catch(error){
            return res.status(500).json(error)
        }
    }
    //удаление пользователя по почте
    async delete (req, res){
        try{
            const {email} = req.params
            const del = await userModel.destroy({where: {email}});
            return res.json(del)
        }catch(error){
            return res.status(500).json(error)
        }
    }
}

module.exports = UserController