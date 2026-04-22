const bcrypt = require('bcrypt')
const userModel = require('../models/userModel')

class UserController {
  async create(req, res) {
    try {
      const { email, password, full_name, second_name, role_id } = req.body

      if (!email || !password || !full_name || !second_name || !role_id) {
        return res.status(400).json({ message: 'Заполните все обязательные поля' })
      }

      const existingUser = await userModel.findOne({ where: { email } })
      if (existingUser) {
        return res.status(400).json({ message: 'Email уже занят' })
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await userModel.create({
        email,
        password: hashedPassword,
        full_name,
        second_name,
        role_id
      })

      return res.status(201).json({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        second_name: user.second_name,
        role_id: user.role_id
      })
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

  async get(req, res) {
    try {
      const users = await userModel.findAll({
        attributes: ['id', 'email', 'full_name', 'second_name', 'role_id']
      })
      return res.json(users)
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

  async update(req, res) {
    try {
      const { email } = req.params
      const { new_email, password, full_name, second_name, role_id } = req.body

      const user = await userModel.findOne({ where: { email } })
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' })
      }

      const updateData = {}

      if (new_email && new_email !== email) {
        const emailOwner = await userModel.findOne({ where: { email: new_email } })
        if (emailOwner) {
          return res.status(400).json({ message: 'Новый email уже занят' })
        }
        updateData.email = new_email
      }

      if (full_name) {
        updateData.full_name = full_name
      }

      if (second_name) {
        updateData.second_name = second_name
      }

      if (role_id) {
        updateData.role_id = role_id
      }

      if (password) {
        updateData.password = await bcrypt.hash(password, 10)
      }

      await userModel.update(updateData, { where: { email } })

      const updatedUser = await userModel.findOne({
        where: { id: user.id },
        attributes: ['id', 'email', 'full_name', 'second_name', 'role_id']
      })

      return res.json(updatedUser)
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }

  async delete(req, res) {
    try {
      const { email } = req.params

      const deletedCount = await userModel.destroy({ where: { email } })
      if (!deletedCount) {
        return res.status(404).json({ message: 'Пользователь не найден' })
      }

      return res.json({ message: 'Пользователь удалён' })
    } catch (error) {
      return res.status(500).json({ message: 'Ошибка сервера', error: error.message })
    }
  }
}

module.exports = UserController
