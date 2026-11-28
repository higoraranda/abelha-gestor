import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'
const storageKey = 'abelha-theme'
const changeEvent = 'abelha-theme-change'

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme)
  const canvas = getComputedStyle(root).getPropertyValue('--canvas').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', canvas)
}

window.addEventListener('storage', event => {
  if (event.storageArea !== localStorage) return
  if (event.key !== storageKey && event.key !== null) return
  applyTheme(event.newValue === 'light' ? 'light' : 'dark')
  window.dispatchEvent(new Event(changeEvent))
})

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener)
  return () => window.removeEventListener(changeEvent, listener)
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, (): Theme => 'dark')
}

export function toggleTheme() {
  const theme = currentTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(theme)
  try {
    localStorage.setItem(storageKey, theme)
  } catch {
    // The current tab can still change theme when storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent))
}
