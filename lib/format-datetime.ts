import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale/pt-BR";

export const APP_TIMEZONE = "America/Sao_Paulo";

export function formatDateTime(iso: string | Date): string {
  return formatInTimeZone(iso, APP_TIMEZONE, "dd 'de' MMM, HH:mm", { locale: ptBR });
}

export function formatDateTimeLong(iso: string | Date): string {
  return formatInTimeZone(iso, APP_TIMEZONE, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
}

export function formatDate(iso: string | Date): string {
  return formatInTimeZone(iso, APP_TIMEZONE, "dd/MM/yyyy", { locale: ptBR });
}

export function formatTime(iso: string | Date): string {
  return formatInTimeZone(iso, APP_TIMEZONE, "HH:mm", { locale: ptBR });
}

export function formatRelativeDateTime(iso: string | Date): string {
  const todayKey = formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
  const yesterdayKey = formatInTimeZone(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    APP_TIMEZONE,
    "yyyy-MM-dd",
  );
  const dateKey = formatInTimeZone(iso, APP_TIMEZONE, "yyyy-MM-dd");
  const time = formatTime(iso);
  if (dateKey === todayKey) return `hoje às ${time}`;
  if (dateKey === yesterdayKey) return `ontem às ${time}`;
  return `em ${formatDateTime(iso)}`;
}

export function formatChartBucket(iso: string | Date, bucket: "hour" | "day" | "week" | "month"): string {
  if (bucket === "hour") return formatInTimeZone(iso, APP_TIMEZONE, "HH:mm", { locale: ptBR });
  if (bucket === "month") return formatInTimeZone(iso, APP_TIMEZONE, "MMM/yy", { locale: ptBR });
  return formatInTimeZone(iso, APP_TIMEZONE, "dd 'de' MMM", { locale: ptBR });
}
