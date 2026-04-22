import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const error = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role_id === 1)

  const login = async (email, password) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        error.value = data.message || 'Ошибка входа'
        return false
      }

      user.value = data.user
      token.value = data.token
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      return true
    } catch (err) {
      error.value = 'Ошибка подключения'
      return false
    } finally {
      loading.value = false
    }
  }

  const register = async (email, password, full_name, second_name) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name, second_name })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        error.value = data.message || 'Ошибка регистрации'
        return false
      }

      user.value = data.user
      token.value = data.token
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      return true
    } catch (err) {
      error.value = 'Ошибка подключения'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    error.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const loadUserFromStorage = () => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
    }
  }

  return {
    user,
    token,
    error,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    loadUserFromStorage
  }
})
