const workspaceModel = require('../models/workspaceModel')
const { writeAuditLog } = require('../services/auditService')

class WorkspaceController{
    //создания нового рабочего места
    async create (req, res){
        try{
            const { work_type_id, workspace_name } = req.body
            const post = await workspaceModel.create({work_type_id, workspace_name});
            res.json(post)
        }
        catch(error){
            res.status(500).json(error)
        }
    }
    //просмотр всех рабочих мест
    async get(req, res){
        try{
            const posts = await workspaceModel.findAll();
            return res.json(posts)
        }catch(error){
            res.status(500).json(error)
        }
    }
    //обновление данных по айди места
    async update(req, res){
        try{
            const {id} = req.params
            const {work_type_id, workspace_name, is_available} = req.body
            const oldWorkspace = await workspaceModel.findOne({ where: { id } })
            if (!oldWorkspace) {
                return res.status(404).json({ message: 'Рабочее место не найдено' })
            }

            const update = await workspaceModel.update({work_type_id, workspace_name, is_available}, {where: {id}})

            const updatedWorkspace = await workspaceModel.findOne({ where: { id } })
            if (oldWorkspace.is_available !== updatedWorkspace.is_available) {
                await writeAuditLog({
                    req,
                    entity: 'workspace',
                    entityId: id,
                    action: updatedWorkspace.is_available ? 'workspace.enabled' : 'workspace.disabled',
                    oldValue: oldWorkspace,
                    newValue: updatedWorkspace
                })
            }

            return res.json(update)
        }catch(error){
            res.status(500).json(error)
        }
    }
    //удаление места по айди
    async delete(req, res){
        try{
            const {id} = req.params
            const del = await workspaceModel.destroy({where: {id}});
            return res.json(del)
        }catch(error){
            res.status(500).json(error)
        }
    }
}

module.exports = WorkspaceController
