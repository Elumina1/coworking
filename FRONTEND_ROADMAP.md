# 🗺️ Frontend Roadmap - Что добавить

## 📊 Текущее состояние vs Полный функционал

```
ТЕКУЩИЙ ФРОНТЕНД (ДА)          ПОЛНЫЙ ФРОНТЕНД (ПЛАНЫ)
┌─────────────────────────┐    ┌────────────────────────────────────┐
│ ✅ Авторизация          │    │ ✅ Авторизация                     │
│ ✅ Регистрация          │    │ ✅ Регистрация                     │
│ ✅ Базовые бронирования │    │ ✅ Полная система бронирований     │
│ ✅ Админ-панель (4 вкл) │    │ ✅ Админ-панель (10+ вкладок)      │
│ ✅ Статистика           │    │ ✅ Профессиональные отчёты        │
│ ❌ Поиск мест           │    │ ❌ Поиск рабочих мест             │
│ ❌ Платежи              │    │ ❌ Платежи YooKassa              │
│ ❌ Управление системой  │    │ ❌ Полное управление              │
│ ❌ Уведомления          │    │ ❌ Уведомления                   │
│ ❌ Профиль пользователя │    │ ❌ Профиль с историей            │
└─────────────────────────┘    └────────────────────────────────────┘
```

---

## 🎯 ФАЗА 1: Критические компоненты (неделя 1-2)

### 1️⃣ BookingCreation - Поиск и бронирование
```
Пользователь
    ↓
[Выберите даты] → [Найти места] → [Выберите место] → [Подтвердить] → Платёж
    ↓
Backend endpoints:
- /search/workspaces (GET)
- /get/booking/slots/:id (GET)
- /post/booking (POST)
```

**Что добавляет:**
- 🔍 Поиск доступных мест по датам
- 📅 Календарь выбора дат
- 🏢 Просмотр доступных слотов
- 📝 Создание бронирования
- 💰 Показ цены

**Время:** 4-5 часов

---

### 2️⃣ PaymentCheckout - Интеграция YooKassa
```
Бронирование создано
    ↓
[Оплатить] → YooKassa Form → [Подтверждение платежа]
    ↓
Backend endpoints:
- /checkout/booking/:id (POST)
- /status/booking/:id (GET)
- /refund/booking/:id (POST)
```

**Что добавляет:**
- 💳 Форма оплаты
- 🔄 Проверка статуса платежа
- 📧 Отправка чека
- ↩️ Возврат средств

**Время:** 5-6 часов

---

### 3️⃣ ReportsPage - Полные аналитика
```
Админ → /admin/reports
    ↓
┌─ Загруженность (график по датам)
├─ Доходы (финансовые отчёты)
├─ Популярные места (какие типы в спросе)
└─ Отчёты по пользователям (история каждого)
```

**Что добавляет:**
- 📊 Графики загруженности
- 💹 Анализ доходов
- 📈 Топ популярных типов
- 👥 Отчёты по пользователям
- 📥 Экспорт в CSV/PDF

**Время:** 6-7 часов

---

## 🎨 ФАЗА 2: Управление системой (неделя 3-4)

### 4️⃣ WorkspaceManagement
```
Админ → /admin/workspaces
    ↓
┌─ [+] Создать новое место
├─ Таблица: Название | Тип | Статус | Действия
├─ [Редактировать] [Удалить]
└─ Фильтр по типу + Поиск
```

**Endpoints:**
- /get/workspace (GET)
- /post/workspace (POST)
- /update/workspace/:id (PUT)
- /delete/workspace/:id (DELETE)

**Время:** 3-4 часа

---

### 5️⃣ UserManagement
```
Админ → /admin/users
    ↓
┌─ [+] Создать пользователя
├─ Таблица: Email | Имя | Роль | Статус | Действия
├─ [Редактировать] [Удалить]
└─ Фильтр + Поиск + Пагинация
```

**Endpoints:**
- /get/user (GET)
- /post/user (POST)
- /update/user/:email (PUT)
- /delete/user/:email (DELETE)

**Время:** 3-4 часа

---

### 6️⃣ PaymentHistory - История платежей
```
Пользователь/Админ → /payments
    ↓
Таблица платежей:
ID | Сумма | Статус | Дата | Действия
     ↓
[Экспорт] [Фильтр] [Поиск] [Деталь платежа]
```

**Endpoints:**
- /get/payment (GET)
- /update/payment/:id (PUT)
- /delete/payment/:id (DELETE)

**Время:** 3-4 часа

---

### 7️⃣ UserProfile - Профиль пользователя
```
Пользователь → /profile
    ↓
┌─ Личные данные (редактируемо)
├─ История бронирований
├─ История платежей
├─ Предпочтения уведомлений
└─ Изменение пароля
```

**Время:** 4-5 часов

---

## 🎁 ФАЗА 3: Дополнительно (неделя 5+)

### 8️⃣ WorkTypeManagement
- Создание типов работ
- Редактирование
- Удаление
- Иконки для каждого типа

**Время:** 2-3 часа

---

### 9️⃣ PriceManagement
- Установка цен по рабочим местам и типам
- Матрица цен
- История изменений

**Время:** 3-4 часа

---

### 🔟 NotificationManager
- Создание уведомлений
- История отправок
- Статистика открытия

**Время:** 3-4 часа

---

## 📊 API Endpoints - Что использовать

### ✅ Уже используется:
```
POST   /login                    ✓
POST   /register                 ✓
GET    /get/booking              ✓
PATCH  /cancel/booking/:id       ✓
PATCH  /confirm/booking/:id      ✓
POST   /remind/booking/:id       ✓
```

### ❌ Не используется (нужно добавить):
```
Бронирования:
GET    /search/workspaces        ← BookingCreation
GET    /get/booking/slots/:id    ← BookingCreation
POST   /post/booking             ← BookingCreation
PUT    /update/booking/:id       ← Редактирование

Платежи:
POST   /checkout/booking/:id     ← PaymentCheckout
GET    /status/booking/:id       ← PaymentCheckout
POST   /refund/booking/:id       ← Возврат
POST   /invoice/booking/:id      ← Чек
GET    /get/payment              ← PaymentHistory
PUT    /update/payment/:id       ← Редактирование
DELETE /delete/payment/:id       ← Удаление

Отчёты:
GET    /reports/occupancy       ← ReportsPage
GET    /reports/revenue         ← ReportsPage
GET    /reports/popular-worktypes ← ReportsPage
GET    /reports/user-bookings   ← ReportsPage

Рабочие места:
GET    /get/workspace           ← WorkspaceManagement
POST   /post/workspace          ← WorkspaceManagement
PUT    /update/workspace/:id    ← WorkspaceManagement
DELETE /delete/workspace/:id    ← WorkspaceManagement

Типы работ:
GET    /get/worktypes           ← WorkTypeManagement
POST   /post/worktypes          ← WorkTypeManagement
PUT    /update/worktypes/:id    ← WorkTypeManagement
DELETE /del/worktypes/:id       ← WorkTypeManagement

Цены:
POST   /post/price              ← PriceManagement
PUT    /update/price/:id        ← PriceManagement

Пользователи:
GET    /get/user                ← UserManagement
POST   /post/user               ← UserManagement
PUT    /update/user/:email      ← UserManagement
DELETE /delete/user/:email      ← UserManagement

Уведомления:
GET    /get/notification        ← NotificationManager
POST   /post/notification       ← NotificationManager
PUT    /update/notification/:id ← NotificationManager
DELETE /delete/notification/:id ← NotificationManager
```

---

## 📁 Новые файлы для создания

### Views (страницы):
```
src/views/
├── LoginView.vue          ✓ (готова)
├── RegisterView.vue       ✓ (готова)
├── UserDashboard.vue      ✓ (базовая, нужны улучшения)
├── AdminDashboard.vue     ✓ (базовая, нужны улучшения)
├── BookingCreation.vue    (НОВАЯ - фаза 1)
├── PaymentCheckout.vue    (НОВАЯ - фаза 1)
├── ReportsPage.vue        (НОВАЯ - фаза 1)
├── WorkspaceManagement.vue (НОВАЯ - фаза 2)
├── UserManagement.vue      (НОВАЯ - фаза 2)
├── UserProfile.vue        (НОВАЯ - фаза 2)
├── PaymentHistory.vue     (НОВАЯ - фаза 2)
├── WorkTypeManagement.vue (НОВАЯ - фаза 3)
├── PriceManagement.vue    (НОВАЯ - фаза 3)
└── NotificationManager.vue (НОВАЯ - фаза 3)
```

### Stores (Pinia):
```
src/stores/
├── auth.js         ✓ (готова)
├── booking.js      (НОВАЯ - фаза 1)
├── payment.js      (НОВАЯ - фаза 1)
├── workspace.js    (НОВАЯ - фаза 2)
├── user.js         (НОВАЯ - фаза 2)
├── worktype.js     (НОВАЯ - фаза 3)
├── price.js        (НОВАЯ - фаза 3)
└── notification.js (НОВАЯ - фаза 3)
```

### Компоненты переиспользуемые:
```
src/components/
├── DataTable.vue       (НОВЫЙ - таблица с фильтрами)
├── Modal.vue          (НОВЫЙ - модальное окно)
├── DateRangePicker.vue (НОВЫЙ - выбор диапазона дат)
├── StatusBadge.vue    (НОВЫЙ - значок статуса)
├── LoadingSpinner.vue (НОВЫЙ - спиннер загрузки)
├── Toast.vue          (НОВЫЙ - всплывающее уведомление)
└── Pagination.vue     (НОВЫЙ - пагинация)
```

---

## 📈 Примерные временные затраты

| Фаза | Компонент | Время | Сложность |
|------|-----------|-------|-----------|
| 1 | BookingCreation | 5h | ⭐⭐⭐⭐ |
| 1 | PaymentCheckout | 6h | ⭐⭐⭐⭐⭐ |
| 1 | ReportsPage | 7h | ⭐⭐⭐⭐⭐ |
| 2 | WorkspaceManagement | 4h | ⭐⭐⭐ |
| 2 | UserManagement | 4h | ⭐⭐⭐ |
| 2 | PaymentHistory | 4h | ⭐⭐⭐ |
| 2 | UserProfile | 5h | ⭐⭐⭐⭐ |
| 3 | WorkTypeManagement | 3h | ⭐⭐ |
| 3 | PriceManagement | 4h | ⭐⭐⭐ |
| 3 | NotificationManager | 4h | ⭐⭐⭐ |
| - | Переиспользуемые компоненты | 10h | ⭐⭐⭐⭐ |
| - | Улучшение дизайна | 8h | ⭐⭐⭐ |

**ИТОГО: ~64 часа (~2 недели интенсивной работы)**

---

## ✅ Приоритизация

### 🔴 Критично (Фаза 1):
- BookingCreation ← Основной функционал
- PaymentCheckout ← Генерирует доход
- ReportsPage ← Нужна админу

### 🟡 Важно (Фаза 2):
- WorkspaceManagement ← Управление
- UserManagement ← Управление
- UserProfile ← Используемость
- PaymentHistory ← Отчётность

### 🟢 Опционально (Фаза 3):
- WorkTypeManagement
- PriceManagement
- NotificationManager

---

## 🚀 Следующие шаги

1. ✅ Определите приоритет (выше)
2. ✅ Распределите разработку по спринтам
3. ✅ Используйте примеры кода из `FRONTEND_CODE_EXAMPLES.md`
4. ✅ Тестируйте каждый компонент
5. ✅ Обновляйте документацию

---

**Полный фронтенд готов к production после выполнения этого плана!** 🎉
