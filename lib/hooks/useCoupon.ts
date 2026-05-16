'use client'

import { useState } from 'react'

export interface HookAppliedCoupon {
  code: string
  type: 'percent' | 'fixed'
  value: number    // valor bruto: percentual (%) ou fixo (R$)
  discount: number // desconto calculado em R$ para o cartTotal atual
}

export function useCoupon(cartTotal: number) {
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<HookAppliedCoupon | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  function calcDiscount(type: string, value: number, total: number): number {
    if (type === 'percent') return (total * value) / 100
    return Math.min(value, total)
  }

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase()
    if (!code) return

    setCouponLoading(true)
    setCouponError('')

    try {
      const res = await fetch(
        `/api/coupons/validate?code=${encodeURIComponent(code)}&subtotal=${cartTotal}`
      )
      const data = await res.json()

      if (!res.ok || data.error) {
        setCouponError(data.error || data.message || 'Cupom inválido ou não encontrado.')
        return
      }

      const discount = calcDiscount(data.type, data.value, cartTotal)
      setAppliedCoupon({
        code: data.code,
        type: data.type,
        value: data.value,
        discount,
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
