const worktypesModel = require('../models/worktypeModels')

class WorktypesController{
    //создание типа комнат
    async create (req, res){
        try{
        const { type_name } = req.body;
        const post = await worktypesModel.create({ type_name });
        res.json(post)
    }
    catch(error){
        res.status(500).json(error)
    }
    }
    //вывод всех типов комнат
    async get (req, res){
        try{
            const posts = await worktypesModel.findAll();
            return res.json(posts);
        }catch(error){
            res.status(500).json(error)
        }
    }
    //удаление по айди 
    async delete (req, res){
        try{
            const {id} = req.params
            const del = await worktypesModel.destroy({ where: {id} });
            return res.json(del);
        }
        catch(error){
            res.status(500).json(error)
        }
    }
    //изминение названия по айди
    async update(req, res){
        try{
            const {id} = req.params
            const {type_name} = req.body
            const update = await worktypesModel.update({type_name}, {where: {id}});
            return res.json(update)
        }
        catch(error){
            res.status(500).json(error)
        }
    }
}

module.exports = WorktypesController