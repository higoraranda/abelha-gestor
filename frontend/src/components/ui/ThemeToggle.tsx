import { Moon, Sun } from 'lucide-react'
import { toggleTheme, useTheme } from '@/lib/theme'

export default function ThemeToggle() {
  const dark = useTheme() === 'dark'
  const label = dark ? 'Ativar tema claro' : 'Ativar tema escuro'
  const Icon = dark ? Sun : Moon

  return (
    <button className="icon-button theme-toggle" type="button" aria-label={label} title={label} onClick={toggleTheme}>
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
