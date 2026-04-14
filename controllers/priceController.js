const priceModel = require('../models/priceModels')

class PriceController{
    //создание новой цены 
    async create (req, res){
        try{
        const { work_type_id, price_day } = req.body;
        const post = await priceModel.create({ work_type_id, price_day });
        res.json(post)
    }
    catch(error){
        res.status(500).json(error)
    }
    }
    // обновление цены по ее айди
    async update (req, res){
        try{
            const {id} = req.params
            const {work_type_id, price_day} = req.body
            const update = await priceModel.update({ work_type_id, price_day}, {where: {id}})
            return res.json(update)
        }
        catch(error){
            return res.status(500).json(error)
        }
    }
}

module.exports = PriceController;