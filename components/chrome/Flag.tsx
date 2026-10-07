import countries from "i18n-iso-countries";
import { cn } from "@/lib/utils";

/** Country flag from ISO3 using the flag-icons set; renders nothing for codes without a flag. */
export function Flag({ iso3, className }: { iso3: string; className?: string }) {
  const iso2 = iso3 === "XKX" ? "xk" : countries.alpha3ToAlpha2(iso3)?.toLowerCase();
  if (!iso2) return null;
  return <span aria-hidden className={cn(`fi fi-${iso2} shrink-0 rounded-[2px]`, className)} />;
}
