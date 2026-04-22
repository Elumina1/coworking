const priceModel = require('../models/priceModels')

class PriceController{
    //получение всех цен
    async get(req, res){
        try{
            const prices = await priceModel.findAll({
                order: [['effective_from', 'DESC'], ['id', 'DESC']]
            })
            return res.json(prices)
        }
        catch(error){
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }
    //создание новой цены 
    async create (req, res){
        try{
        const { work_type_id, price_day } = req.body;
        const post = await priceModel.create({ work_type_id, price_day });
        res.json(post)
    }
    catch(error){
        res.status(500).json({ message: 'Ошибка сервера', error: error.message })
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
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
        }
    }
}

module.exports = PriceController;
