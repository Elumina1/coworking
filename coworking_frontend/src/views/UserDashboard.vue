<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { bookingService, workspaceService, workTypeService, paymentService } from '../services/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formatDateForInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

const filters = ref({
  start_date: formatDateForInput(today),
  end_date: formatDateForInput(tomorrow)
})

const bookings = ref([])
const workspaces = ref([])
const workTypes = ref([])
const availableWorkspaceIds = ref(new Set())

const initialLoading = ref(false)
const availabilityLoading = ref(false)
const bookingsLoading = ref(false)
const bookingSubmitting = ref(false)
const paymentLoadingId = ref(null)

const selectedWorkspaceId = ref(null)
const bookingMessage = ref('')
const availabilityMessage = ref('')
const paymentMessage = ref('')
const hoveredWorkspaceId = ref(null)
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  subtitle: '',
  status: ''
})

const mapAreas = [
  { id: 17, shape: 'rect', attrs: { x: 726, y: 1, width: 70, height: 100 }, zone: 'Переговорные', center: { x: 761, y: 51 } },
  { id: 18, shape: 'rect', attrs: { x: 726, y: 200, width: 70, height: 100 }, zone: 'Переговорные', center: { x: 761, y: 250 } },
  { id: 21, shape: 'rect', attrs: { x: 288, y: 1, width: 100, height: 100 }, zone: 'Командные комнаты', center: { x: 338, y: 51 } },
  { id: 24, shape: 'rect', attrs: { x: 288, y: 200, width: 100, height: 100 }, zone: 'Командные комнаты', center: { x: 338, y: 250 } },
  { id: 19, shape: 'rect', attrs: { x: 536, y: 1, width: 100, height: 100 }, zone: 'Командные комнаты', center: { x: 586, y: 51 } },
  { id: 22, shape: 'rect', attrs: { x: 536, y: 200, width: 100, height: 100 }, zone: 'Командные комнаты', center: { x: 586, y: 250 } },
  { id: 20, shape: 'rect', attrs: { x: 412, y: 1, width: 100, height: 100 }, zone: 'Командные комнаты', center: { x: 462, y: 51 } },
  { id: 23, shape: 'rect', attrs: { x: 412, y: 200, width: 100, height: 100 }, zone: 'Командные комнаты', center: { x: 462, y: 250 } },
  { id: 25, shape: 'path', attrs: { d: 'M0 1H230V200H0V1Z' }, zone: 'Приватный кабинет', center: { x: 115, y: 100 } },
  { id: 4, shape: 'rect', attrs: { x: 696, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 726, y: 655 } },
  { id: 5, shape: 'rect', attrs: { x: 618, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 648, y: 655 } },
  { id: 6, shape: 'rect', attrs: { x: 540, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 570, y: 655 } },
  { id: 10, shape: 'rect', attrs: { x: 228, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 258, y: 655 } },
  { id: 12, shape: 'rect', attrs: { x: 72, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 102, y: 655 } },
  { id: 11, shape: 'rect', attrs: { x: 150, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 180, y: 655 } },
  { id: 7, shape: 'rect', attrs: { x: 462, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 492, y: 655 } },
  { id: 9, shape: 'rect', attrs: { x: 306, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 336, y: 655 } },
  { id: 8, shape: 'rect', attrs: { x: 384, y: 635, width: 60, height: 40 }, zone: 'Open Space', center: { x: 414, y: 655 } },
  { id: 13, shape: 'rect', attrs: { x: 501, y: 440, width: 60, height: 40 }, zone: 'Open Space', center: { x: 531, y: 460 } },
  { id: 14, shape: 'rect', attrs: { x: 423, y: 440, width: 60, height: 40 }, zone: 'Open Space', center: { x: 453, y: 460 } },
  { id: 15, shape: 'rect', attrs: { x: 501, y: 499, width: 60, height: 40 }, zone: 'Open Space', center: { x: 531, y: 519 } },
  { id: 16, shape: 'rect', attrs: { x: 423, y: 499, width: 60, height: 40 }, zone: 'Open Space', center: { x: 453, y: 519 } }
]

//const zoneLabels = [
  //{ id: 'meeting', x: 732, y: 132, text: 'Переговорные' },
  //{ id: 'team', x: 462, y: 132, text: 'Командные комнаты' },
  //{ id: 'private', x: 115, y: 110, text: 'Приватный кабинет' },
  //{ id: 'open', x: 336, y: 608, text: 'Open Space' }
//]

const mapDecorations = [
  { shape: 'rect', attrs: { width: 796, height: 696, fill: '#F5F5F5' } },
  { shape: 'rect', attrs: { x: 0, y: 1, width: 796, height: 695, fill: '#D9D9D9' } },
  { shape: 'rect', attrs: { x: 413, y: 414, width: 10, height: 146, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 395, y: 200, width: 10, height: 105, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 519, y: 200, width: 10, height: 105, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 519, y: 1, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 710, y: 1, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 710, y: 200, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 271, y: 200, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 230, y: 0, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 271, y: 0, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 643, y: 200, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 643, y: 1, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 395, y: 1, width: 10, height: 100, fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 423, y: 414, width: 10, height: 135, transform: 'rotate(90 423 414)', fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 796, y: 686, width: 10, height: 796, transform: 'rotate(90 796 686)', fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 653, y: 300, width: 10, height: 382, transform: 'rotate(90 653 300)', fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 230, y: 200, width: 10, height: 230, transform: 'rotate(90 230 200)', fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 796, y: 300, width: 10, height: 86, transform: 'rotate(90 796 300)', fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 423, y: 550, width: 10, height: 135, transform: 'rotate(90 423 550)', fill: '#A78484' } },
  { shape: 'rect', attrs: { x: 288, y: 414, width: 10, height: 146, fill: '#A78484' } }
]

const workspaceMap = computed(() =>
  new Map(workspaces.value.map((workspace) => [workspace.id, workspace]))
)

const workTypeMap = computed(() =>
  new Map(workTypes.value.map((type) => [type.id, type]))
)

const selectedWorkspace = computed(() => workspaceMap.value.get(selectedWorkspaceId.value) || null)

const selectedWorkspaceType = computed(() => {
  if (!selectedWorkspace.value) {
    return null
  }

  return workTypeMap.value.get(selectedWorkspace.value.work_type_id) || null
})

const selectedWorkspaceStatus = computed(() => {
  if (!selectedWorkspace.value) {
    return null
  }

  if (!selectedWorkspace.value.is_available) {
    return 'disabled'
  }

  return availableWorkspaceIds.value.has(selectedWorkspace.value.id) ? 'available' : 'occupied'
})

const selectedWorkspaceDatabaseStatus = computed(() => {
  if (!selectedWorkspace.value) {
    return null
  }

  return selectedWorkspace.value.is_available ? 'is_available = true' : 'is_available = false'
})

const selectedBookingDays = computed(() => {
  const start = new Date(filters.value.start_date)
  const end = new Date(filters.value.end_date)
  const diff = end.getTime() - start.getTime()

  if (Number.isNaN(diff) || diff <= 0) {
    return 0
  }

  return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

const enrichedBookings = computed(() =>
  bookings.value.map((booking) => ({
    ...booking,
    latestPayment: Array.isArray(booking.payments) && booking.payments.length > 0 ? booking.payments[0] : null
  }))
)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const getAreaFill = (workspaceId) => {
  const workspace = workspaceMap.value.get(workspaceId)
  if (!workspace || !workspace.is_available || !availableWorkspaceIds.value.has(workspaceId)) {
    return '#D7D9DD'
  }

  return '#00D26A'
}

const getAreaClass = (workspaceId) => {
  const workspace = workspaceMap.value.get(workspaceId)
  const isSelectable = Boolean(
    workspace &&
    workspace.is_available &&
    availableWorkspaceIds.value.has(workspaceId)
  )

  return {
    seat: true,
    selectable: isSelectable,
    blocked: !isSelectable,
    selected: selectedWorkspaceId.value === workspaceId,
    hovered: hoveredWorkspaceId.value === workspaceId
  }
}

const getAreaTitle = (workspaceId) => {
  const workspace = workspaceMap.value.get(workspaceId)

  if (!workspace) {
    return `Место #${workspaceId}: не настроено в системе`
  }

  const typeName = workTypeMap.value.get(workspace.work_type_id)?.type_name || 'Неизвестный тип'
  const status = !workspace.is_available
    ? 'недоступно'
    : availableWorkspaceIds.value.has(workspaceId)
      ? 'доступно'
      : 'занято в выбранный период'

  return `${workspace.workspace_name} • ${typeName} • ${status}`
}

const getAreaStatusLabel = (workspaceId) => {
  const workspace = workspaceMap.value.get(workspaceId)

  if (!workspace || !workspace.is_available) {
    return 'Недоступно в базе'
  }

  return availableWorkspaceIds.value.has(workspaceId) ? 'Доступно для выбора' : 'Недоступно на выбранные даты'
}

const selectWorkspace = (workspaceId) => {
  const workspace = workspaceMap.value.get(workspaceId)

  if (!workspace || !workspace.is_available || !availableWorkspaceIds.value.has(workspaceId)) {
    bookingMessage.value = ''
    return
  }

  bookingMessage.value = ''
  selectedWorkspaceId.value = workspaceId
}

const showTooltip = (workspaceId, event) => {
  hoveredWorkspaceId.value = workspaceId

  const workspace = workspaceMap.value.get(workspaceId)
  const typeName = workspace ? workTypeMap.value.get(workspace.work_type_id)?.type_name || 'Неизвестный тип' : 'Не добавлено в систему'

  tooltip.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    title: workspace ? workspace.workspace_name : `Место #${workspaceId}`,
    subtitle: typeName,
    status: getAreaStatusLabel(workspaceId)
  }
}

const moveTooltip = (workspaceId, event) => {
  if (hoveredWorkspaceId.value !== workspaceId) {
    hoveredWorkspaceId.value = workspaceId
  }

  tooltip.value = {
    ...tooltip.value,
    visible: true,
    x: event.clientX,
    y: event.clientY
  }
}

const hideTooltip = () => {
  hoveredWorkspaceId.value = null
  tooltip.value.visible = false
}

const ensureSelectedWorkspaceIsValid = () => {
  const currentWorkspace = workspaceMap.value.get(selectedWorkspaceId.value)

  if (
    currentWorkspace &&
    currentWorkspace.is_available &&
    availableWorkspaceIds.value.has(currentWorkspace.id)
  ) {
    return
  }

  const firstSelectableWorkspace = workspaces.value.find(
    (workspace) => workspace.is_available && availableWorkspaceIds.value.has(workspace.id)
  )

  selectedWorkspaceId.value = firstSelectableWorkspace?.id || null
}

const loadWorkspaceData = async () => {
  const [workspacesResponse, workTypesResponse] = await Promise.all([
    workspaceService.getAll(),
    workTypeService.getAll()
  ])

  workspaces.value = workspacesResponse.data
  workTypes.value = workTypesResponse.data

  if (!selectedWorkspaceId.value && workspaces.value.length > 0) {
    selectedWorkspaceId.value = workspaces.value[0].id
  }
}

const loadBookings = async () => {
  bookingsLoading.value = true
  try {
    const response = await bookingService.getMyBookings()
    bookings.value = response.data
  } catch (error) {
    bookingMessage.value = error?.response?.data?.message || 'Не удалось загрузить ваши бронирования'
  } finally {
    bookingsLoading.value = false
  }
}

const loadAvailability = async () => {
  availabilityMessage.value = ''

  if (!filters.value.start_date || !filters.value.end_date) {
    availabilityMessage.value = 'Укажите даты бронирования'
    return
  }

  if (filters.value.start_date >= filters.value.end_date) {
    availabilityMessage.value = 'Дата окончания должна быть позже даты начала'
    return
  }

  availabilityLoading.value = true
  try {
    const response = await bookingService.searchWorkspaces({
      start_date: filters.value.start_date,
      end_date: filters.value.end_date
    })

    availableWorkspaceIds.value = new Set(
      (response.data.availableWorkspaces || []).map((workspace) => workspace.id)
    )
    ensureSelectedWorkspaceIsValid()
  } catch (error) {
    availabilityMessage.value = error?.response?.data?.message || 'Не удалось загрузить доступность мест'
  } finally {
    availabilityLoading.value = false
  }
}

const createBooking = async () => {
  bookingMessage.value = ''

  if (!selectedWorkspace.value) {
    bookingMessage.value = 'Сначала выберите место на карте.'
    return
  }

  if (selectedWorkspaceStatus.value !== 'available') {
    bookingMessage.value = 'Выбранное место недоступно для бронирования на этот период.'
    return
  }

  if (selectedBookingDays.value <= 0) {
    bookingMessage.value = 'Проверьте выбранные даты.'
    return
  }

  bookingSubmitting.value = true
  try {
    const response = await bookingService.createBooking({
      workspace_id: selectedWorkspace.value.id,
      start_date: filters.value.start_date,
      end_date: filters.value.end_date
    })

    await Promise.all([loadBookings(), loadAvailability()])
    bookingMessage.value = `Место "${selectedWorkspace.value.workspace_name}" забронировано. Сумма: ${Number(response.data.total_price).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
  } catch (error) {
    bookingMessage.value = error?.response?.data?.message || 'Не удалось создать бронирование'
  } finally {
    bookingSubmitting.value = false
  }
}

const cancelBooking = async (id) => {
  if (!confirm('Отменить это бронирование?')) {
    return
  }

  try {
    await bookingService.cancelBooking(id)
    await Promise.all([loadBookings(), loadAvailability()])
  } catch (error) {
    bookingMessage.value = error?.response?.data?.message || 'Не удалось отменить бронирование'
  }
}

const getPaymentStatusLabel = (booking) => {
  const status = booking.latestPayment?.payment_status

  if (!status) {
    return 'Не создан'
  }

  const map = {
    pending: 'Ожидает оплаты',
    waiting_for_capture: 'Ожидает подтверждения',
    succeeded: 'Оплачено',
    canceled: 'Отменён',
    refunded: 'Возврат',
    failed: 'Ошибка'
  }

  return map[status] || status
}

const openCheckout = async (booking) => {
  paymentMessage.value = ''
  paymentLoadingId.value = booking.id

  try {
    const response = await paymentService.createCheckout(booking.id)
    await loadBookings()

    if (response.data.confirmation_url) {
      window.open(response.data.confirmation_url, '_blank', 'noopener,noreferrer')
      paymentMessage.value = 'Страница оплаты открыта в новой вкладке.'
    } else {
      paymentMessage.value = response.data.message || 'Платёж создан.'
    }
  } catch (error) {
    paymentMessage.value = error?.response?.data?.message || 'Не удалось создать платёж'
  } finally {
    paymentLoadingId.value = null
  }
}

const refreshPaymentStatus = async (booking) => {
  paymentMessage.value = ''
  paymentLoadingId.value = booking.id

  try {
    const response = await paymentService.getStatus(booking.id)
    await loadBookings()
    paymentMessage.value = response.data.message || 'Статус оплаты обновлён'
  } catch (error) {
    paymentMessage.value = error?.response?.data?.message || 'Не удалось обновить статус оплаты'
  } finally {
    paymentLoadingId.value = null
  }
}

const handlePaymentReturn = async () => {
  const paymentFlag = route.query.payment
  const bookingId = Number(route.query.bookingId)

  if (paymentFlag !== 'return' || !bookingId) {
    return
  }

  paymentMessage.value = 'Проверяем статус оплаты после возврата из YooKassa...'
  paymentLoadingId.value = bookingId

  try {
    const response = await paymentService.getStatus(bookingId)
    await Promise.all([loadBookings(), loadAvailability()])
    paymentMessage.value = response.data.message || 'Оплата успешно обновлена'
  } catch (error) {
    paymentMessage.value = error?.response?.data?.message || 'Не удалось обновить оплату после возврата'
  } finally {
    paymentLoadingId.value = null
    router.replace({ path: route.path, query: {} })
  }
}

onMounted(async () => {
  initialLoading.value = true
  try {
    await Promise.all([loadWorkspaceData(), loadBookings()])
    await loadAvailability()
    await handlePaymentReturn()
  } finally {
    initialLoading.value = false
  }
})

watch(
  () => [filters.value.start_date, filters.value.end_date],
  async (newValue, oldValue) => {
    if (initialLoading.value) {
      return
    }

    if (newValue[0] === oldValue?.[0] && newValue[1] === oldValue?.[1]) {
      return
    }

    await loadAvailability()
  }
)
</script>

<template>
  <div class="user-dashboard">
    <nav class="navbar">
      <div class="navbar-left">
        <p class="eyebrow">Coworking Booking</p>
        <h1>Выберите место на карте</h1>
      </div>
      <div class="navbar-right">
        <span class="user-pill">{{ authStore.user?.full_name }} {{ authStore.user?.second_name }}</span>
        <button @click="handleLogout" class="btn-logout">Выход</button>
      </div>
    </nav>

    <main class="container">
      <section class="hero-card">
        <div class="hero-copy">
          <p class="hero-kicker">Главный экран бронирования</p>
          <h2>Карта свободных мест обновляется под выбранные даты</h2>
          <p>
            Нажмите на место на схеме, проверьте его статус и сразу отправьте бронирование.
            Цвета карты берутся из backend-доступности для выбранного периода.
          </p>
        </div>

        <div class="legend">
          <span><i class="legend-dot available"></i> Доступно</span>
          <span><i class="legend-dot occupied"></i> Занято</span>
          <span><i class="legend-dot selected"></i> Выбрано</span>
          <span><i class="legend-dot disabled"></i> Недоступно</span>
          <span><i class="legend-dot missing"></i> Не настроено</span>
        </div>
      </section>

      <section class="booking-layout">
        <div class="map-panel">
          <div class="panel-header">
            <div>
              <h3>Карта мест</h3>
              <p>Период нужен для точной проверки доступности.</p>
            </div>
          </div>

          <div class="filters">
            <label class="field">
              <span>Дата начала</span>
              <input v-model="filters.start_date" type="date">
            </label>

            <label class="field">
              <span>Дата окончания</span>
              <input v-model="filters.end_date" type="date">
            </label>
          </div>

          <p v-if="availabilityMessage" class="message error">{{ availabilityMessage }}</p>
          <p v-if="bookingMessage" :class="['message', bookingMessage.includes('забронировано') ? 'success' : 'info']">
            {{ bookingMessage }}
          </p>
          <p v-if="paymentMessage" :class="['message', paymentMessage.includes('не удалось') || paymentMessage.includes('не найден') ? 'error' : 'info']">
            {{ paymentMessage }}
          </p>

          <div v-if="initialLoading" class="loading-state">Загрузка карты...</div>

          <div v-else class="map-shell">
            <svg
              class="workspace-map"
              viewBox="0 0 796 696"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Карта рабочих мест"
              role="img"
            >
              <component
                :is="shape.shape"
                v-for="(shape, index) in mapDecorations"
                :key="`decor-${index}`"
                v-bind="shape.attrs"
              />

              <component
                :is="area.shape"
                v-for="area in mapAreas"
                :key="area.id"
                v-bind="area.attrs"
                :fill="getAreaFill(area.id)"
                :class="getAreaClass(area.id)"
                stroke="#17324D"
                stroke-width="2"
                @click="selectWorkspace(area.id)"
                @mouseenter="showTooltip(area.id, $event)"
                @mousemove="moveTooltip(area.id, $event)"
                @mouseleave="hideTooltip"
              >
                <title>{{ getAreaTitle(area.id) }}</title>
              </component>

              <g class="zone-labels">
                <text
                  v-for="label in zoneLabels"
                  :key="label.id"
                  :x="label.x"
                  :y="label.y"
                  text-anchor="middle"
                  class="zone-label"
                >
                  {{ label.text }}
                </text>
              </g>

              <g v-for="area in mapAreas" :key="`mark-${area.id}`" class="selection-mark">
                <circle
                  v-if="selectedWorkspaceId === area.id"
                  :cx="area.center.x"
                  :cy="area.center.y"
                  r="16"
                  fill="rgba(255, 255, 255, 0.96)"
                />
                <path
                  v-if="selectedWorkspaceId === area.id"
                  :d="`M ${area.center.x - 7} ${area.center.y + 1} L ${area.center.x - 1} ${area.center.y + 7} L ${area.center.x + 9} ${area.center.y - 6}`"
                  fill="none"
                  stroke="#0B7A47"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>

            <div
              v-if="tooltip.visible"
              class="map-tooltip"
              :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
            >
              <strong>{{ tooltip.title }}</strong>
              <span>{{ tooltip.subtitle }}</span>
              <em>{{ tooltip.status }}</em>
            </div>
          </div>
        </div>

        <aside class="details-panel">
          <div class="panel-header">
            <div>
              <h3>Выбранное место</h3>
              <p>Сведения о месте и быстрое бронирование.</p>
            </div>
          </div>

          <div v-if="!selectedWorkspace" class="empty-state">
            <p>Выберите место на карте, чтобы увидеть детали.</p>
          </div>

          <div v-else class="workspace-card">
            <div class="workspace-top">
              <div>
                <p class="workspace-zone">{{ mapAreas.find(item => item.id === selectedWorkspace.id)?.zone }}</p>
                <h4>{{ selectedWorkspace.workspace_name }}</h4>
              </div>
              <span :class="['availability-chip', selectedWorkspaceStatus]">
                {{
                  selectedWorkspaceStatus === 'available'
                    ? 'Можно выбрать'
                    : selectedWorkspaceStatus === 'occupied'
                      ? 'Недоступно по датам'
                      : 'Недоступно'
                }}
              </span>
            </div>

            <dl class="workspace-meta">
              <div>
                <dt>ID места</dt>
                <dd>#{{ selectedWorkspace.id }}</dd>
              </div>
              <div>
                <dt>Тип</dt>
                <dd>{{ selectedWorkspaceType?.type_name || 'Не указан' }}</dd>
              </div>
              <div>
                <dt>Статус из базы</dt>
                <dd>{{ selectedWorkspaceDatabaseStatus }}</dd>
              </div>
              <div>
                <dt>Период</dt>
                <dd>{{ filters.start_date }} - {{ filters.end_date }}</dd>
              </div>
              <div>
                <dt>Длительность</dt>
                <dd>{{ selectedBookingDays }} дн.</dd>
              </div>
            </dl>

            <div class="workspace-note">
              <p>Итоговую стоимость и статус система рассчитает на сервере по актуальной цене выбранного типа места.</p>
            </div>

            <button
              class="btn-book"
              :disabled="bookingSubmitting || selectedWorkspaceStatus !== 'available' || selectedBookingDays <= 0"
              @click="createBooking"
            >
              {{ bookingSubmitting ? 'Бронируем...' : 'Забронировать место' }}
            </button>
          </div>
        </aside>
      </section>

      <section class="bookings-section">
        <div class="panel-header">
          <div>
            <h3>Мои бронирования</h3>
            <p>Все активные и прошлые заявки пользователя.</p>
          </div>
        </div>

        <div v-if="bookingsLoading" class="loading-state">Загрузка бронирований...</div>

        <div v-else-if="bookings.length === 0" class="empty-state wide">
          <p>У вас пока нет бронирований.</p>
        </div>

        <div v-else class="bookings-grid">
          <article v-for="booking in enrichedBookings" :key="booking.id" class="booking-card">
            <div class="booking-card-header">
              <div>
                <p class="booking-card-type">{{ booking.workspace?.work_type?.type_name || 'Рабочее место' }}</p>
                <h4>{{ booking.workspace?.workspace_name || `Место #${booking.workspace_id}` }}</h4>
              </div>
              <span :class="['status-chip', booking.booking_status]">
                {{ booking.booking_status }}
              </span>
            </div>

            <div class="booking-details">
              <p><strong>Период:</strong> {{ new Date(booking.start_date).toLocaleDateString('ru-RU') }} - {{ new Date(booking.end_date).toLocaleDateString('ru-RU') }}</p>
              <p><strong>Цена в день:</strong> {{ Number(booking.price_per_day || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₽</p>
              <p><strong>Итого:</strong> {{ Number(booking.total_price || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₽</p>
            </div>

            <div class="payment-box">
              <div class="payment-row">
                <span class="payment-label">Статус оплаты</span>
                <span :class="['payment-chip', booking.latestPayment?.payment_status || 'none']">
                  {{ getPaymentStatusLabel(booking) }}
                </span>
              </div>

              <p v-if="booking.latestPayment?.receipt_id" class="payment-note">
                Чек сформирован: {{ booking.latestPayment.receipt_id }}
              </p>

              <div class="payment-actions">
                <button
                  v-if="booking.booking_status !== 'cancelled' && booking.latestPayment?.payment_status !== 'succeeded'"
                  class="btn-pay"
                  :disabled="paymentLoadingId === booking.id"
                  @click="openCheckout(booking)"
                >
                  {{ paymentLoadingId === booking.id ? 'Подготавливаем...' : 'Оплатить бронь' }}
                </button>

                <button
                  v-if="booking.latestPayment?.external_id && booking.latestPayment?.payment_status !== 'succeeded'"
                  class="btn-secondary-action"
                  :disabled="paymentLoadingId === booking.id"
                  @click="refreshPaymentStatus(booking)"
                >
                  Проверить оплату
                </button>
              </div>
            </div>

            <button
              v-if="booking.booking_status === 'pending'"
              class="btn-cancel"
              @click="cancelBooking(booking.id)"
            >
              Отменить бронь
            </button>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.user-dashboard {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(244, 141, 91, 0.18), transparent 30%),
    linear-gradient(180deg, #f2ece2 0%, #e9dfd1 100%);
  color: #2d241c;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 28px 36px;
  background: linear-gradient(135deg, #0f4c5c 0%, #143847 100%);
  color: #fdf7ef;
  box-shadow: 0 22px 50px rgba(20, 56, 71, 0.18);
}

.eyebrow,
.hero-kicker,
.workspace-zone,
.booking-card-type {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.78;
}

.navbar-left h1 {
  margin: 6px 0 0;
  font-size: 2rem;
  line-height: 1.05;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.user-pill {
  padding: 10px 14px;
  border: 1px solid rgba(253, 247, 239, 0.22);
  border-radius: 999px;
  background: rgba(253, 247, 239, 0.1);
}

.btn-logout {
  border: 1px solid rgba(253, 247, 239, 0.4);
  background: transparent;
  color: #fdf7ef;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-logout:hover {
  background: rgba(253, 247, 239, 0.12);
  transform: translateY(-1px);
}

.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px 20px 40px;
}

.hero-card,
.map-panel,
.details-panel,
.bookings-section {
  background: rgba(255, 250, 243, 0.94);
  border: 1px solid rgba(95, 72, 54, 0.08);
  border-radius: 28px;
  box-shadow: 0 20px 48px rgba(95, 72, 54, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-end;
  padding: 24px 26px;
  margin-bottom: 22px;
}

.hero-copy h2 {
  margin: 6px 0 10px;
  font-size: 1.7rem;
}

.hero-copy p:last-child {
  margin: 0;
  color: #65584a;
  max-width: 760px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 14px;
  color: #594e44;
  font-size: 0.92rem;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot.available {
  background: #00d26a;
}

.legend-dot.occupied {
  background: #ff6b57;
}

.legend-dot.selected {
  background: #1c7cff;
}

.legend-dot.disabled {
  background: #616161;
}

.legend-dot.missing {
  background: #a0a7b4;
}

.booking-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.8fr);
  gap: 20px;
}

.map-panel,
.details-panel,
.bookings-section {
  padding: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.35rem;
}

.panel-header p {
  margin: 6px 0 0;
  color: #6f6254;
}

.filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.field {
  display: grid;
  gap: 8px;
  color: #4d4035;
  font-weight: 600;
}

.field input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d7c8b6;
  border-radius: 14px;
  background: #fff;
  color: #2d241c;
  font: inherit;
}

.field input:focus {
  outline: none;
  border-color: #1c7cff;
  box-shadow: 0 0 0 3px rgba(28, 124, 255, 0.14);
}

.btn-primary,
.btn-book,
.btn-cancel {
  border: none;
  border-radius: 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.btn-primary {
  padding: 12px 16px;
  background: linear-gradient(135deg, #ff8a47 0%, #e96a2c 100%);
  color: #fff8f2;
}

.btn-book {
  width: 100%;
  padding: 14px 18px;
  background: linear-gradient(135deg, #0f8f58 0%, #18b871 100%);
  color: #fff;
}

.btn-cancel {
  padding: 12px 16px;
  background: #c6534a;
  color: #fff;
}

.btn-primary:hover,
.btn-book:hover,
.btn-cancel:hover {
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.message {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.95rem;
}

.message.error {
  background: rgba(198, 83, 74, 0.14);
  color: #8e3129;
}

.message.info {
  background: rgba(28, 124, 255, 0.12);
  color: #174f99;
}

.message.success {
  background: rgba(15, 143, 88, 0.12);
  color: #0f6a43;
}

.loading-state,
.empty-state {
  min-height: 180px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #7b6f63;
}

.empty-state.wide {
  min-height: 140px;
}

.map-shell {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(23, 50, 77, 0.1);
  background: #efe7dc;
}

.workspace-map {
  width: 100%;
  height: auto;
  display: block;
}

.seat {
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: center;
}

.seat.selectable {
  cursor: pointer;
}

.seat.selectable:hover {
  opacity: 0.9;
  transform: scale(0.98);
}

.seat.selected {
  filter: drop-shadow(0 0 8px rgba(15, 143, 88, 0.28));
}

.seat.hovered {
  filter: brightness(1.04);
}

.seat.blocked {
  cursor: default;
}

.zone-label {
  font-size: 24px;
  font-weight: 800;
  fill: rgba(23, 50, 77, 0.58);
  letter-spacing: 0.04em;
  pointer-events: none;
}

.selection-mark {
  pointer-events: none;
}

.map-tooltip {
  position: fixed;
  z-index: 20;
  pointer-events: none;
  transform: translate(14px, 14px);
  display: grid;
  gap: 4px;
  min-width: 180px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(20, 33, 47, 0.94);
  color: #fffaf2;
  box-shadow: 0 16px 32px rgba(20, 33, 47, 0.22);
}

.map-tooltip span,
.map-tooltip em {
  font-size: 0.85rem;
}

.map-tooltip em {
  color: #99f0c1;
  font-style: normal;
}

.workspace-card {
  display: grid;
  gap: 18px;
}

.workspace-top {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.workspace-top h4 {
  margin: 4px 0 0;
  font-size: 1.4rem;
}

.availability-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.availability-chip.available {
  background: rgba(0, 210, 106, 0.15);
  color: #0b7a47;
}

.availability-chip.occupied {
  background: rgba(255, 107, 87, 0.15);
  color: #a13a2b;
}

.availability-chip.disabled {
  background: rgba(97, 97, 97, 0.16);
  color: #474747;
}

.workspace-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
}

.workspace-meta div {
  padding: 14px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(95, 72, 54, 0.08);
}

.workspace-meta dt {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a6b5d;
  margin-bottom: 6px;
}

.workspace-meta dd {
  margin: 0;
  font-weight: 700;
  color: #33281f;
}

.workspace-note {
  padding: 16px;
  border-radius: 18px;
  background: rgba(15, 76, 92, 0.08);
  color: #264754;
}

.workspace-note p {
  margin: 0;
}

.bookings-section {
  margin-top: 22px;
}

.bookings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.booking-card {
  padding: 20px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid rgba(95, 72, 54, 0.08);
  display: grid;
  gap: 16px;
}

.booking-card-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.booking-card-header h4 {
  margin: 4px 0 0;
  font-size: 1.15rem;
}

.status-chip.pending {
  background: rgba(255, 183, 77, 0.18);
  color: #9a5e04;
}

.status-chip.confirmed {
  background: rgba(0, 210, 106, 0.14);
  color: #0b7a47;
}

.status-chip.completed {
  background: rgba(28, 124, 255, 0.14);
  color: #174f99;
}

.status-chip.cancelled {
  background: rgba(198, 83, 74, 0.14);
  color: #8e3129;
}

.booking-details {
  display: grid;
  gap: 8px;
  color: #5e5145;
}

.booking-details p {
  margin: 0;
}

.payment-box {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(15, 76, 92, 0.06);
}

.payment-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.payment-label {
  font-weight: 700;
  color: #4a4037;
}

.payment-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.payment-chip.none,
.payment-chip.pending,
.payment-chip.waiting_for_capture {
  background: rgba(255, 183, 77, 0.18);
  color: #9a5e04;
}

.payment-chip.succeeded {
  background: rgba(0, 210, 106, 0.14);
  color: #0b7a47;
}

.payment-chip.canceled,
.payment-chip.failed {
  background: rgba(198, 83, 74, 0.14);
  color: #8e3129;
}

.payment-chip.refunded {
  background: rgba(28, 124, 255, 0.14);
  color: #174f99;
}

.payment-note {
  margin: 0;
  color: #5f5348;
  font-size: 0.92rem;
}

.payment-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-pay,
.btn-secondary-action {
  border: none;
  border-radius: 12px;
  padding: 11px 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.btn-pay {
  background: linear-gradient(135deg, #1c7cff 0%, #1452d4 100%);
  color: #fff;
}

.btn-secondary-action {
  background: #e8ddd0;
  color: #43382e;
}

.btn-pay:hover,
.btn-secondary-action:hover {
  transform: translateY(-1px);
}

@media (max-width: 1120px) {
  .booking-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .navbar,
  .hero-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .navbar {
    padding: 22px 20px;
  }

  .container {
    padding: 20px 14px 32px;
  }

  .filters {
    grid-template-columns: 1fr;
  }

  .workspace-meta {
    grid-template-columns: 1fr;
  }
}
</style>
