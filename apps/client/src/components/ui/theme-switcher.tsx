import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  colorThemes,
  modes,
  applyTheme,
  getInitialTheme,
  type ColorTheme,
  type Mode,
} from '@/lib/config/themes'

export function ThemeSwitcher() {
  const [color, setColor] = useState<ColorTheme>('teal')
  const [mode, setMode] = useState<Mode>('light')

  useEffect(() => {
    const initial = getInitialTheme()
    setColor(initial.color)
    setMode(initial.mode)
    applyTheme(initial.color, initial.mode)
  }, [])

  const handleColorChange = (newColor: ColorTheme) => {
    setColor(newColor)
    applyTheme(newColor, mode)
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    applyTheme(color, newMode)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button variant="outline" size="icon" {...props}>
            <Palette className="size-4" />
          </Button>
        )}
      />
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={color}
            onValueChange={(v) => handleColorChange(v as ColorTheme)}
          >
            {colorThemes.map((theme) => (
              <DropdownMenuRadioItem key={theme.id} value={theme.id}>
                <span
                  className="mr-2 inline-block size-3 rounded-full border border-border"
                  style={{ backgroundColor: theme.color }}
                />
                {theme.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(v) => handleModeChange(v as Mode)}
          >
            {modes.map((m) => (
              <DropdownMenuRadioItem key={m.id} value={m.id}>
                {m.id === 'light' ? (
                  <SunIcon className="mr-2 size-4" />
                ) : (
                  <MoonIcon className="mr-2 size-4" />
                )}
                {m.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
