import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import UserDashboard from '../views/UserDashboard.vue'
import AdminDashboard from '../views/AdminDashboard.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: null, // Will be determined based on role
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/user',
    name: 'UserDashboard',
    component: UserDashboard,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Загружаем пользователя если еще не загружен
  if (!authStore.user && !authStore.token) {
    authStore.loadUserFromStorage()
  }

  // Если требуется авторизация
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login')
      return
    }

    // Если требуется права администратора
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next('/user')
      return
    }

    // Редирект с /dashboard на правильный дашборд
    if (to.path === '/dashboard') {
      next(authStore.isAdmin ? '/admin' : '/user')
      return
    }
  }

  // Если уже залогинен, не пускать на login/register
  if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    next(authStore.isAdmin ? '/admin' : '/user')
    return
  }

  next()
})

export default router
