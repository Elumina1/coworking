const roleModel = require('../models/roleModel')

class RoleController {
    //создание роли
    async create (req, res){
        try{
        const { role_name } = req.body;
        const post = await roleModel.create({ role_name });
        res.json(post)
    }
    catch(error){
        res.status(500).json(error)
    }
    }
}

module.exports = RoleController;