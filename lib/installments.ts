export function getBestInstallment(price: number) {
  if (price < 10) return null;
  const value = price / 3;
  return {
    n: 3,
    value,
    label: `3x de R$ ${value.toFixed(2).replace(".", ",")} no cartão`,
  };
}
