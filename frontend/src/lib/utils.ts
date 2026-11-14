import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {BUSINESS_TIME_ZONE,parseApiInstant} from "./businessDateTime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "XAF"): string {
  return new Intl.NumberFormat("fr-CG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = parseApiInstant(dateString);
    if(!date)return dateString;
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: BUSINESS_TIME_ZONE,
    }).format(date);
  } catch {
    return dateString;
  }
}

/** Formats a MySQL civil date-time without applying the browser or UTC offset. */
export function formatBusinessLocalDateTime(value:string):string{
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if(!match)return value;
  const[,year,month,day,hour,minute]=match;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}
