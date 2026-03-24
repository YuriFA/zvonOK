export type ColorTheme = 'teal' | 'coral' | 'blue' | 'rose'
export type Mode = 'light' | 'dark'

export interface Theme {
  id: ColorTheme
  label: string
  cssClass: string
  color: string
}

export const colorThemes: Theme[] = [
  {
    id: 'teal',
    label: 'Teal',
    cssClass: '',
    color: '#79C1B5',
  },
  {
    id: 'coral',
    label: 'Coral',
    cssClass: 'theme-coral',
    color: '#D95B63',
  },
  {
    id: 'blue',
    label: 'Blue',
    cssClass: 'theme-blue',
    color: '#6F92E6',
  },
  {
    id: 'rose',
    label: 'Rose',
    cssClass: 'theme-rose',
    color: '#B57C73',
  },
]

export const modes: { id: Mode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const STORAGE_KEY_COLOR = 'theme-color'
const STORAGE_KEY_MODE = 'theme-mode'

function getInitialColor(): ColorTheme {
  if (typeof window === 'undefined') return 'teal'
  const stored = localStorage.getItem(STORAGE_KEY_COLOR)
  if (stored && colorThemes.some((t) => t.id === stored)) {
    return stored as ColorTheme
  }
  return 'teal'
}

function getInitialMode(): Mode {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY_MODE)
  if (stored === 'dark' || stored === 'light') return stored
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function getInitialTheme(): { color: ColorTheme; mode: Mode } {
  return { color: getInitialColor(), mode: getInitialMode() }
}

export function applyTheme(color: ColorTheme, mode: Mode): void {
  const root = document.documentElement
  root.classList.remove('dark', 'theme-coral', 'theme-blue', 'theme-rose')
  if (mode === 'dark') root.classList.add('dark')
  const theme = colorThemes.find((t) => t.id === color)
  if (theme?.cssClass) root.classList.add(theme.cssClass)
  localStorage.setItem(STORAGE_KEY_COLOR, color)
  localStorage.setItem(STORAGE_KEY_MODE, mode)
}
