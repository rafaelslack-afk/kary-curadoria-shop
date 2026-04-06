export const runtime = 'nodejs'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  addToMECart,
  purchaseMEShipment,
  generateMELabel,
  printMELabel,
  getMETracking,
} from '@/lib/melhorenvio-shipping'
import { sendOrderShippedEmail } from '@/lib/email/send'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient()

  try {
    // Buscar pedido completo com itens e variantes
    const { data: order, error } = await admin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product_variants (
            sku, size, color, weight_g,
            products (name, weight_g, length_cm, width_cm, height_cm, price)
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.status !== 'paid' && order.status !== 'preparing') {
      return NextResponse.json(
        { error: 'Pedido precisa estar pago para gerar etiqueta' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const address = order.shipping_address_json as any
    const customerName = order.guest_name ?? 'Cliente'
    const customerEmail = order.guest_email ?? ''
    const customerDoc = (order.guest_cpf ?? '').replace(/\D/g, '')

    // Montar produtos para o ME
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = (order.order_items as any[]).map((item) => {
      const variant = item.product_variants
      const product = variant?.products
      return {
        name: item.product_name as string,
        quantity: item.quantity as number,
        weight: ((product?.weight_g ?? 500) as number) / 1000, // gramas → kg
        width: (product?.width_cm ?? 20) as number,
        height: (product?.height_cm ?? 5) as number,
        length: (product?.length_cm ?? 30) as number,
        unitPrice: Number(item.unit_price),
      }
    })

    console.log('[label] Adicionando ao carrinho ME...')

    // Passo 1: Adicionar ao carrinho
    const cartItem = await addToMECart({
      orderNumber: order.order_number,
      service: order.shipping_service ?? 'PAC',
      customerName,
      customerDocument: customerDoc,
      customerEmail,
      customerPhone: (address?.telefone ?? address?.phone ?? '11940224088') as string,
      address: {
        cep: (address?.cep ?? '') as string,
        street: (address?.logradouro ?? address?.street ?? '') as string,
        number: (address?.numero ?? address?.number ?? 'S/N') as string,
        complement: (address?.complemento ?? address?.complement) as string | undefined,
        neighborhood: (address?.bairro ?? address?.neighborhood ?? '') as string,
        city: (address?.cidade ?? address?.city ?? '') as string,
        state: (address?.estado ?? address?.state ?? 'SP') as string,
      },
      products,
    })

    console.log('[label] Comprando frete...', cartItem.id)

    // Passo 2: Comprar (débita carteira ME)
    await purchaseMEShipment(cartItem.id)

    // Passo 3: Gerar etiqueta
    await generateMELabel(cartItem.id)

    // Passo 4: Obter URL de impressão
    const printData = await printMELabel(cartItem.id)
    const labelUrl = printData?.url ?? null

    // Passo 5: Obter código de rastreio (ME pode demorar alguns segundos)
    await new Promise((r) => setTimeout(r, 2000))
    const trackingCode = await getMETracking(cartItem.id)

    console.log('[label] Tracking:', trackingCode, '| URL:', labelUrl)

    // Atualizar pedido com rastreio e status
    await admin
      .from('orders')
      .update({
        tracking_code: trackingCode ?? order.tracking_code,
        status: 'shipped',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    // Enviar e-mail ao cliente
    if (trackingCode && customerEmail) {
      try {
        await sendOrderShippedEmail({
          to: customerEmail,
          orderNumber: String(order.order_number),
          customerName,
          trackingCode,
        })
        console.log('[label] E-mail de envio disparado para:', customerEmail)
      } catch (emailErr) {
        console.error('[label] Erro ao enviar e-mail:', emailErr)
      }
    }

    return NextResponse.json({
      ok: true,
      cartItemId: cartItem.id,
      labelUrl,
      trackingCode,
      message: trackingCode
        ? `Etiqueta gerada! Rastreio: ${trackingCode}`
        : 'Etiqueta gerada! Código de rastreio pendente.',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[label] Erro:', msg)
    return NextResponse.json(
      { error: msg ?? 'Erro ao gerar etiqueta' },
      { status: 500 }
    )
  }
}
