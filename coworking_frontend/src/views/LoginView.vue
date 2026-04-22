<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  const success = await authStore.login(email.value, password.value)
  loading.value = false

  if (success) {
    router.push(authStore.isAdmin ? '/admin' : '/user')
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Вход в систему</h1>
      
      <div class="form-group">
        <label>Email:</label>
        <input v-model="email" type="email" placeholder="your@email.com">
      </div>

      <div class="form-group">
        <label>Пароль:</label>
        <input v-model="password" type="password" placeholder="Ваш пароль">
      </div>

      <div v-if="authStore.error" class="error-message">
        {{ authStore.error }}
      </div>

      <button @click="handleLogin" :disabled="loading" class="btn-login">
        {{ loading ? 'Загрузка...' : 'Войти' }}
      </button>

      <p class="register-link">
        Нет аккаунта? <router-link to="/register">Зарегистрироваться</router-link>
      </p>

      <div class="test-credentials">
        <p><strong>Тестовые аккаунты:</strong></p>
        <p>Админ: admin@test.com / admin123</p>
        <p>Пользователь: user@test.com / user123</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: Arial, sans-serif;
}

.login-card {
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

.btn-login {
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

.btn-login:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-login:disabled {
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

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.register-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: bold;
}

.register-link a:hover {
  text-decoration: underline;
}

.test-credentials {
  background: #f0f0f0;
  padding: 15px;
  border-radius: 5px;
  margin-top: 20px;
  font-size: 12px;
  color: #666;
}

.test-credentials p {
  margin: 5px 0;
}

.test-credentials strong {
  color: #333;
}
</style>
