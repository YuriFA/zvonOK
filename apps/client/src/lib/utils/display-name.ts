const STORAGE_KEY = "zvonok:guest_display_name";

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = (Math.abs(hash) % 16) + 1;
  return `var(--avatar-color-${index})`;
}

export function loadGuestDisplayName(): string {
  return localStorage.getItem(STORAGE_KEY) || "Guest";
}

export function saveGuestDisplayName(name: string): void {
  localStorage.setItem(STORAGE_KEY, name);
}
