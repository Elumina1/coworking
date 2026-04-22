<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const full_name = ref('')
const second_name = ref('')
const loading = ref(false)

const handleRegister = async () => {
  if (!email.value || !password.value || !full_name.value || !second_name.value) {
    authStore.error = 'Заполните все поля'
    return
  }

  loading.value = true
  const success = await authStore.register(email.value, password.value, full_name.value, second_name.value)
  loading.value = false

  if (success) {
    router.push('/user')
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <h1>Регистрация</h1>
      
      <div class="form-group">
        <label>Email:</label>
        <input v-model="email" type="email" placeholder="your@email.com">
      </div>

      <div class="form-group">
        <label>Имя:</label>
        <input v-model="full_name" type="text" placeholder="Ваше имя">
      </div>

      <div class="form-group">
        <label>Фамилия:</label>
        <input v-model="second_name" type="text" placeholder="Ваша фамилия">
      </div>

      <div class="form-group">
        <label>Пароль:</label>
        <input v-model="password" type="password" placeholder="Минимум 6 символов">
      </div>

      <div v-if="authStore.error" class="error-message">
        {{ authStore.error }}
      </div>

      <button @click="handleRegister" :disabled="loading" class="btn-register">
        {{ loading ? 'Загрузка...' : 'Зарегистрироваться' }}
      </button>

      <p class="login-link">
        Уже есть аккаунт? <router-link to="/login">Войти</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: Arial, sans-serif;
}

.register-card {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 28px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-register {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.3s;
  margin-top: 20px;
}

.btn-register:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-register:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 5px;
  margin-bottom: 20px;
  text-align: center;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.login-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: bold;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
