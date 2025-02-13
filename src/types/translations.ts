// Generate types from the translation structure
type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`

type DotNestedKeys<T> = (T extends object ?
  { [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}` }[Exclude<keyof T, symbol>] : 
  '') extends infer D ? Extract<D, string> : never;

// Import JSON type
import type translations from '@/locales/en.json';

// Export the type for all possible translation keys
export type TranslationKeys = DotNestedKeys<typeof translations>; 