# TASK-100 — Avatar Pastel Colors for Remote Video

> **Status:** completed
> **Priority:** medium
> **Created:** 2026-03-30

---

## Description

Add 16 pastel colors assigned to users deterministically via hash of their username. When video is off, the avatar placeholder circle uses a unique pastel color instead of the generic `bg-gray-500`.

## Scope

- CSS variables for 16 pastel avatar colors (light + dark theme)
- Hash-based utility function to pick a color by username
- Update `RemoteVideo` component to use dynamic avatar color with dark text

## Technical Design

### CSS Variables (`index.css`)

16 colors in `:root` and `.dark`, evenly spaced across hue (0-330, step ~22):

```
--avatar-color-1 through --avatar-color-16
```

Light theme: high lightness (~0.82), low-mid chroma (~0.08) in oklch.
Dark theme: slightly lower lightness (~0.30), slightly higher chroma (~0.10).

### Utility (`lib/utils/display-name.ts`)

`getAvatarColor(username: string): string` — simple hash of username → index 1-16 → returns `var(--avatar-color-{N})`.

### Component (`remote-video.tsx`)

Replace `bg-gray-500 text-white` on the initials circle with `style={{ backgroundColor: getAvatarColor(username) }}` and `text-gray-800`.

## Acceptance Criteria

- [ ] 16 CSS variables `--avatar-color-*` defined in `:root` and `.dark`
- [ ] `getAvatarColor()` returns consistent color for the same username
- [ ] Avatar circle uses pastel background with dark text when video is off
- [ ] Colors look good in both light and dark themes

## Related Files

- `apps/client/src/index.css`
- `apps/client/src/lib/utils/display-name.ts`
- `apps/client/src/components/remote-video.tsx`
