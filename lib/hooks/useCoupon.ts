'use client'

import { useState } from 'react'

export interface HookAppliedCoupon {
  code: string
  type: 'percent' | 'fixed'
  value: number    // valor bruto: percentual (%) ou fixo (R$)
  discount: number // desconto calculado em R$ para o cartTotal atual
  allowed_payment_methods: 'all' | 'pix' | 'credit_card'
  product_id: string | null
}

export function useCoupon(
  cartTotal: number,
  options?: {
    productIds?: string[]
  }
) {
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<HookAppliedCoupon | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase()
    if (!code) return

    setCouponLoading(true)
    setCouponError('')

    try {
      const params = new URLSearchParams({ code, subtotal: String(cartTotal) })
      if (options?.productIds?.length) {
        params.append('product_ids', options.productIds.join(','))
      }
      const res = await fetch(`/api/coupons/validate?${params}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        setCouponError(data.error || data.message || 'Cupom inválido ou não encontrado.')
        return
      }

      setAppliedCoupon({
        code: data.code,
        type: data.type,
        value: data.value,
        discount: data.discount,
        allowed_payment_methods: data.allowed_payment_methods ?? 'all',
        product_id: data.product_id ?? null,
      })
      setCouponCode('')
    } catch {
      setCouponError('Erro ao validar o cupom. Tente novamente.')
    } finally {
      setCouponLoading(false)
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponError('')
  }

  return {
    couponCode,
    setCouponCode,
    appliedCoupon,
    couponError,
    couponLoading,
    applyCoupon,
    removeCoupon,
  }
}
