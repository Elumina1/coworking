const { YooCheckout } = require('@a2seven/yoo-checkout')

const checkout = new YooCheckout({
  shopId: process.env.YOO_SHOP_ID,
  secretKey: process.env.YOO_SECRET_KEY,
  debug: process.env.NODE_ENV !== 'production'
})

function formatAmount(amount) {
  return {
    value: Number(amount).toFixed(2),
    currency: 'RUB'
  }
}

async function createYooPayment({ amount, description, returnUrl, metadata = {} }) {
  const payload = {
    amount: formatAmount(amount),
    payment_method_data: { type: 'bank_card' },
    confirmation: {
      type: 'redirect',
      return_url: returnUrl
    },
    capture: true,
    description,
    metadata
  }

  return checkout.createPayment(payload)
}

async function getYooPayment(paymentId) {
  return checkout.getPayment(paymentId)
}

async function cancelYooPayment(paymentId) {
  return checkout.cancelPayment(paymentId)
}

async function createYooRefund({ paymentId, amount, description }) {
  return checkout.createRefund({
    payment_id: paymentId,
    amount: formatAmount(amount),
    description
  })
}

async function createYooReceipt({
  paymentId,
  customer,
  items,
  settlements,
  send,
  tax_system_code = 1,
  on_behalf_of
}) {
  const payload = {
    type: 'payment',
    payment_id: paymentId,
    customer,
    items,
    tax_system_code
  }

  if (Array.isArray(settlements) && settlements.length > 0) {
    payload.settlements = settlements
  }

  if (typeof send === 'boolean') {
    payload.send = send
  }

  if (on_behalf_of) {
    payload.on_behalf_of = on_behalf_of
  }

  return checkout.createReceipt(payload)
}

module.exports = {
  createYooPayment,
  getYooPayment,
  cancelYooPayment,
  createYooRefund,
  createYooReceipt
}
