# 📋 План улучшений Frontend для полного использования Backend

## 🎯 Текущее состояние

**Что создано:**
- ✅ Авторизация (login, register)
- ✅ Базовая панель пользователя (просмотр своих бронирований)
- ✅ Базовая админ-панель (таблица бронирований, простая статистика)

**Что НЕ используется из Backend:**
- ❌ Поиск рабочих мест и доступные слоты
- ❌ Создание новых бронирований через систему
- ❌ Платежи YooKassa
- ❌ Полные отчёты (доходы, загруженность, популярные типы, отчёты по пользователям)
- ❌ Управление рабочими местами (create, update, delete)
- ❌ Управление типами работ
- ❌ Управление ценами
- ❌ Управление пользователями (для админа)
- ❌ Уведомления
- ❌ Профиль пользователя

---

## 📦 Обновления API сервиса

### Добавить новые методы в `services/api.js`:

```javascript
// Управление рабочими местами
workspaceService = {
  getAll: () => api.get('/get/workspace'),
  create: (data) => api.post('/post/workspace', data),
  update: (id, data) => api.put(`/update/workspace/${id}`, data),
  delete: (id) => api.delete(`/delete/workspace/${id}`)
}

// Типы рабочих мест
workTypeService = {
  getAll: () => api.get('/get/worktypes'),
  create: (data) => api.post('/post/worktypes', data),
  update: (id, data) => api.put(`/update/worktypes/${id}`, data),
  delete: (id) => api.delete(`/del/worktypes/${id}`)
}

// Цены
priceService = {
  create: (data) => api.post('/post/price', data),
  update: (id, data) => api.put(`/update/price/${id}`, data)
}

// Платежи
paymentService = {
  createCheckout: (bookingId) => api.post(`/checkout/booking/${bookingId}`),
  getStatus: (bookingId) => api.get(`/status/booking/${bookingId}`),
  refund: (bookingId) => api.post(`/refund/booking/${bookingId}`),
  generateInvoice: (bookingId) => api.post(`/invoice/booking/${bookingId}`),
  getAll: () => api.get('/get/payment'),
  update: (id, data) => api.put(`/update/payment/${id}`, data),
  delete: (id) => api.delete(`/delete/payment/${id}`)
}

// Пользователи
userService = {
  getAll: () => api.get('/get/user'),
  create: (data) => api.post('/post/user', data),
  update: (email, data) => api.put(`/update/user/${email}`, data),
  delete: (email) => api.delete(`/delete/user/${email}`)
}

// Отчёты бронирований
reportService = {
  getOccupancy: (start_date, end_date) => 
    api.get('/reports/occupancy', { params: { start_date, end_date } }),
  getRevenue: (start_date, end_date) => 
    api.get('/reports/revenue', { params: { start_date, end_date } }),
  getPopularWorkTypes: (start_date, end_date) => 
    api.get('/reports/popular-worktypes', { params: { start_date, end_date } }),
  getUserBookings: (start_date, end_date) => 
    api.get('/reports/user-bookings', { params: { start_date, end_date } })
}

// Уведомления
notificationService = {
  getAll: () => api.get('/get/notification'),
  create: (data) => api.post('/post/notification', data),
  update: (id, data) => api.put(`/update/notification/${id}`, data),
  delete: (id) => api.delete(`/delete/notification/${id}`)
}

// Дополнительное для бронирований
bookingService = {
  search: (start_date, end_date, work_type_id) =>
    api.get('/search/workspaces', { params: { start_date, end_date, work_type_id } }),
  getSlots: (workspace_id, date) =>
    api.get(`/get/booking/slots/${workspace_id}`, { params: { date } })
}
```

---

## 🎨 Новые компоненты/страницы

### 1. **BookingCreationPage.vue** - Создание бронирования
- Выбор дат (calendar picker)
- Поиск доступных рабочих мест
- Фильтр по типу рабочего места
- Просмотр доступных слотов
- Выбор времени
- Подтверждение и оплата

### 2. **WorkspaceManagementPage.vue** - Управление рабочими местами (АДМИН)
- Таблица всех рабочих мест
- Кнопка создания нового
- Редактирование
- Удаление
- Фильтр по типу
- Поиск по названию

### 3. **WorkTypeManagementPage.vue** - Управление типами (АДМИН)
- Список типов работ
- Создание нового типа
- Редактирование
- Удаление

### 4. **PriceManagementPage.vue** - Управление ценами (АДМИН)
- Таблица цен по рабочим местам и типам
- Установка цен
- Редактирование

### 5. **UserManagementPage.vue** - Управление пользователями (АДМИН)
- Таблица всех пользователей
- Создание пользователя
- Редактирование роли/данных
- Удаление пользователя
- Поиск и фильтры

### 6. **PaymentHistoryPage.vue** - История платежей (АДМИН + USER)
- Таблица платежей
- Статусы платежей
- История возвратов
- Экспорт в CSV
- Фильтры по датам и статусам

### 7. **ReportsPage.vue** - Полные отчёты (АДМИН)
- Вкладка "Загруженность" - график загруженности по датам
- Вкладка "Доходы" - финансовые отчёты по периодам
- Вкладка "Популярные места" - какие типы работ самые востребованные
- Вкладка "Отчёты по пользователям" - бронирования каждого пользователя
- Экспорт отчётов

### 8. **NotificationsPage.vue** - Управление уведомлениями (АДМИН)
- Список всех уведомлений
- Создание уведомления
- Редактирование
- Удаление
- История отправок

### 9. **UserProfilePage.vue** - Профиль пользователя
- Просмотр личных данных
- Редактирование профиля
- Просмотр истории бронирований
- История платежей
- Предпочтения уведомлений

### 10. **PaymentCheckoutPage.vue** - Оплата через YooKassa
- Форма оплаты
- Интеграция с YooKassa API
- Редирект на платежный шлюз
- Подтверждение платежа
- История транзакций

---

## 🔧 Улучшения существующих компонентов

### UserDashboard.vue:
- ✅ Добавить кнопку "Забронировать новое место"
- ✅ Добавить фильтры (статус, дата)
- ✅ Добавить экспорт в PDF/Excel
- ✅ Показывать детали бронирования (рабочее место, цена)
- ✅ Интеграция с платежами - "Оплатить" кнопка с редиректом
- ✅ История отмен и возвратов

### AdminDashboard.vue:
- ✅ Добавить больше вкладок:
  - Бронирования (текущая)
  - Платежи (текущая)
  - Отчёты (текущая)
  - Рабочие места (НОВАЯ)
  - Типы работ (НОВАЯ)
  - Цены (НОВАЯ)
  - Пользователи (НОВАЯ)
  - Уведомления (НОВАЯ)
  - Настройки (текущая)
- ✅ Улучшенная статистика
- ✅ Графики (Chart.js)
- ✅ Фильтры и поиск
- ✅ Экспорт данных

### Navbar.vue:
- ✅ Добавить меню с быстрой навигацией
- ✅ Показывать непрочитанные уведомления
- ✅ Ссылка на профиль
- ✅ Адаптивное меню для мобильных

---

## 📊 Хранилища (Stores)

### Создать новые Pinia stores:

```
stores/
├── auth.js              ✅ (существует)
├── booking.js           (НОВАЯ)
├── workspace.js         (НОВАЯ)
├── worktype.js          (НОВАЯ)
├── price.js             (НОВАЯ)
├── user.js              (НОВАЯ)
├── payment.js           (НОВАЯ)
├── notification.js      (НОВАЯ)
└── report.js            (НОВАЯ)
```

Каждое хранилище должно содержать:
- state (список элементов, текущий элемент, ошибки, loading)
- getters (фильтрация, сортировка)
- actions (fetch, create, update, delete)

---

## 🗺️ Обновления маршрутов (Router)

```javascript
const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView },
  { path: '/profile', component: UserProfilePage, meta: { requiresAuth: true } },
  
  // Пользователь
  { path: '/bookings', component: UserDashboard, meta: { requiresAuth: true } },
  { path: '/bookings/create', component: BookingCreationPage, meta: { requiresAuth: true } },
  { path: '/payments', component: PaymentHistoryPage, meta: { requiresAuth: true } },
  { path: '/payment/checkout/:bookingId', component: PaymentCheckoutPage, meta: { requiresAuth: true } },
  
  // Админ
  { path: '/admin', redirect: '/admin/dashboard' },
  { path: '/admin/dashboard', component: AdminDashboard, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/workspaces', component: WorkspaceManagementPage, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/worktypes', component: WorkTypeManagementPage, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/prices', component: PriceManagementPage, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/users', component: UserManagementPage, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/payments', component: PaymentHistoryPage, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/reports', component: ReportsPage, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/notifications', component: NotificationsPage, meta: { requiresAuth: true, requiresAdmin: true } }
]
```

---

## 🎨 UI/UX улучшения

### Компоненты для переиспользования:
- DataTable.vue - универсальная таблица с фильтрами, сортировкой, пагинацией
- Modal.vue - модальное окно для create/edit
- DateRangePicker.vue - выбор диапазона дат
- StatusBadge.vue - значки статусов
- LoadingSpinner.vue - индикатор загрузки
- Toast.vue - уведомления об ошибках/успехе
- Pagination.vue - пагинация таблиц

### Стили:
- Улучшенная цветовая схема
- Dark mode
- Адаптивный дизайн для мобильных
- Анимации переходов
- Улучшенная типография

---

## 📦 Дополнительные библиотеки

```json
{
  "dependencies": {
    "chart.js": "^3.9.1",
    "vue-chartjs": "^5.0.1",
    "date-fns": "^2.29.3",
    "xlsx": "^0.18.5"
  }
}
```

---

## ✅ Приоритет реализации

### Phase 1 (Критически важно):
1. ✅ BookingCreationPage - поиск и создание бронирований
2. ✅ PaymentCheckoutPage - интеграция платежей
3. ✅ ReportsPage - отчёты для админа
4. ✅ Улучшенный UserDashboard - фильтры, экспорт

### Phase 2 (Важно):
5. WorkspaceManagementPage - управление рабочими местами
6. UserManagementPage - управление пользователями
7. PaymentHistoryPage - история платежей
8. UserProfilePage - профиль пользователя

### Phase 3 (Дополнительно):
9. WorkTypeManagementPage - управление типами
10. PriceManagementPage - управление ценами
11. NotificationsPage - управление уведомлениями
12. Улучшенный дизайн и анимации

---

## 🔗 Связь с Backend

Все компоненты должны взаимодействовать с соответствующими endpoints Backend:

| Frontend | Backend |
|----------|---------|
| BookingCreation | `/search/workspaces`, `/get/booking/slots` |
| PaymentCheckout | `/checkout/booking/:id`, `/status/booking/:id` |
| ReportsPage | `/reports/occupancy`, `/reports/revenue`, `/reports/popular-worktypes`, `/reports/user-bookings` |
| WorkspaceManagement | `/get/workspace`, `/post/workspace`, `/update/workspace`, `/delete/workspace` |
| UserManagement | `/get/user`, `/post/user`, `/update/user`, `/delete/user` |
| PaymentHistory | `/get/payment`, `/refund/booking/:id` |

---

## 📝 Финальный чек-лист

- [ ] Обновить API сервис со всеми новыми методами
- [ ] Создать все новые компоненты
- [ ] Создать Pinia stores для всех сущностей
- [ ] Обновить маршруты
- [ ] Создать переиспользуемые компоненты
- [ ] Добавить библиотеки для графиков и экспорта
- [ ] Интегрировать с YooKassa платежами
- [ ] Тестирование всех функций
- [ ] Оптимизация производительности
- [ ] Документирование кода

---

## 📊 Примерная сложность

- Низкая сложность (1-2 часа): WorkTypeManagement, PriceManagement
- Средняя сложность (3-5 часов): ReportsPage, UserManagement, PaymentHistory
- Высокая сложность (5-8 часов): BookingCreation, PaymentCheckout
- Очень высокая (8+ часов): Полная переделка AdminDashboard с графиками

**Общее время**: ~40-60 часов для полной реализации

---

Этот план обеспечит полное использование всех возможностей Backend и создаст профессиональное приложение, готовое к production! 🚀
