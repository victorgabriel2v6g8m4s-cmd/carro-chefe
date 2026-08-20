import { ptBR } from "./locales/pt-BR";

export const defaultLocale = "pt-BR" as const;
export type SupportedLocale = typeof defaultLocale;

const catalogs = { "pt-BR": ptBR } as const;

export function getMessages(locale: SupportedLocale = defaultLocale) {
  return catalogs[locale];
}

export const messages = getMessages();
