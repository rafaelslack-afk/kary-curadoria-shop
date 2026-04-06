const ME_BASE =
  process.env.MELHORENVIO_ENV === 'production'
    ? 'https://melhorenvio.com.br/api/v2'
    : 'https://sandbox.melhorenvio.com.br/api/v2'

const ME_TOKEN =
  process.env.MELHORENVIO_ENV === 'production'
    ? process.env.MELHORENVIO_TOKEN_PRODUCTION
    : process.env.MELHORENVIO_TOKEN_SANDBOX

const meHeaders = {
  Authorization: `Bearer ${ME_TOKEN}`,
  'Content-Type': 'application/json',
  'User-Agent': 'KVO Kary Curadoria (contato@karycuradoria.com.br)',
  Accept: 'application/json',
}

export interface MEProduct {
  name: string
  quantity: number
  weight: number   // kg
  width: number    // cm
  height: number   // cm
  length: number   // cm
  unitPrice: number
}

export interface MEOrderData {
  orderNumber: number
  service: string // ex: 'PAC', 'SEDEX'
  customerName: string
  customerDocument: string
  customerEmail: string
  customerPhone: string
  address: {
    cep: string
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
  }
  products: MEProduct[]
}

// Passo 1: Adicionar frete ao carrinho do ME
export async function addToMECart(orderData: MEOrderData) {
  // PAC = 1, SEDEX = 2
  const serviceId = orderData.service.toUpperCase().includes('SEDEX') ? 2 : 1

  const payload = {
    service: serviceId,
    agency: null,
    from: {
      name: 'Kary Curadoria',
      phone: '11940224088',
      email: 'contato@karycuradoria.com.br',
      document: process.env.MELHORENVIO_CNPJ ?? '',
      company_document: process.env.MELHORENVIO_CNPJ ?? '',
      state_register: '',
      address: 'Rua Min. Firmino Whitaker',
      complement: 'Box 142',
      number: '49',
      district: 'Brás',
      city: 'São Paulo',
      country_id: 'BR',
      postal_code: process.env.MELHORENVIO_CEP_ORIGEM ?? '01500000',
      note: '',
    },
    to: {
      name: orderData.customerName,
      phone: orderData.customerPhone.replace(/\D/g, ''),
      email: orderData.customerEmail,
      document: orderData.customerDocument.replace(/\D/g, ''),
      address: orderData.address.street,
      complement: orderData.address.complement ?? '',
      number: orderData.address.number,
      district: orderData.address.neighborhood,
      city: orderData.address.city,
      state_abbr: orderData.address.state,
      country_id: 'BR',
      postal_code: orderData.address.cep.replace(/\D/g, ''),
      note: '',
    },
    products: orderData.products.map((p) => ({
      name: p.name,
      quantity: p.quantity,
      unitary_value: p.unitPrice,
      weight: p.weight,
    })),
    volumes: orderData.products.map((p) => ({
      height: p.height,
      width: p.width,
      length: p.length,
      weight: p.weight,
    })),
    options: {
      insurance_value: orderData.products.reduce(
        (sum, p) => sum + p.unitPrice * p.quantity,
        0
      ),
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: false,
      invoice: { key: null },
      platform: 'KVO',
      tags: [`pedido-${orderData.orderNumber}`],
    },
  }

  const res = await fetch(`${ME_BASE}/me/cart`, {
    method: 'POST',
    headers: meHeaders,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`ME Cart error: ${JSON.stringify(err)}`)
  }

  return res.json() as Promise<{ id: string; [key: string]: unknown }>
}

// Passo 2: Comprar o frete (débita da carteira ME)
export async function purchaseMEShipment(cartItemId: string) {
  const res = await fetch(`${ME_BASE}/me/shipment/checkout`, {
    method: 'POST',
    headers: meHeaders,
    body: JSON.stringify({ orders: [cartItemId] }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`ME Purchase error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

// Passo 3: Gerar etiqueta
export async function generateMELabel(cartItemId: string) {
  const res = await fetch(`${ME_BASE}/me/shipment/generate`, {
    method: 'POST',
    headers: meHeaders,
    body: JSON.stringify({ orders: [cartItemId] }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`ME Generate error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

// Passo 4: Imprimir etiqueta (obter URL do PDF)
export async function printMELabel(cartItemId: string) {
  const res = await fetch(`${ME_BASE}/me/shipment/print`, {
    method: 'POST',
    headers: meHeaders,
    body: JSON.stringify({ mode: 'public', orders: [cartItemId] }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`ME Print error: ${JSON.stringify(err)}`)
  }

  return res.json() as Promise<{ url?: string }>
}

// Passo 5: Buscar código de rastreio
export async function getMETracking(cartItemId: string): Promise<string | null> {
  const res = await fetch(
    `${ME_BASE}/me/orders/tracking?orders[]=${cartItemId}`,
    { method: 'GET', headers: meHeaders }
  )

  if (!res.ok) return null

  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.[cartItemId]?.tracking ?? null
}
