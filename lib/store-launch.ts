const rawLaunchAt =
  process.env.NEXT_PUBLIC_STORE_LAUNCH_AT ??
  process.env.STORE_LAUNCH_AT ??
  "";

function parseLaunchDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const STORE_PRELAUNCH_ENABLED =
  process.env.STORE_PRELAUNCH_ENABLED !== "false";

export const STORE_LAUNCH_AT = parseLaunchDate(rawLaunchAt);

export function isStorePrelaunchActive(now = new Date()): boolean {
  if (!STORE_PRELAUNCH_ENABLED) return false;
  if (!STORE_LAUNCH_AT) return true;
  return now.getTime() < STORE_LAUNCH_AT.getTime();
}

export function formatLaunchDatePtBr(): string | null {
  if (!STORE_LAUNCH_AT) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(STORE_LAUNCH_AT);
}
