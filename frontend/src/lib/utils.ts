import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// cn: combina classes Tailwind de forma segura, resolvendo conflitos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
