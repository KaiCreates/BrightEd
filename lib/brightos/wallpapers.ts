export const BRIGHTOS_WALLPAPER_FILES = [
  'BrightOS Cyan.jpg',
  'BrightOS Green.jpg',
  'BrightOS Orange.jpg',
  'BrightOS Purple.jpg',
  'BrightOS Violet.jpg',
] as const;

export type BrightOSWallpaperFile = (typeof BRIGHTOS_WALLPAPER_FILES)[number];

const SESSION_KEY = 'brightos_wallpaper_v1';

export function wallpaperUrl(file: BrightOSWallpaperFile) {
  return `/api/brightos/wallpaper/${encodeURIComponent(file)}`;
}

export function pickRandomWallpaperFile(rng: () => number = Math.random): BrightOSWallpaperFile {
  const idx = Math.floor(rng() * BRIGHTOS_WALLPAPER_FILES.length);
  return BRIGHTOS_WALLPAPER_FILES[Math.max(0, Math.min(BRIGHTOS_WALLPAPER_FILES.length - 1, idx))];
}

export function getSessionWallpaperFile(): BrightOSWallpaperFile {
  if (typeof window === 'undefined') return BRIGHTOS_WALLPAPER_FILES[0];

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing && (BRIGHTOS_WALLPAPER_FILES as readonly string[]).includes(existing)) {
    return existing as BrightOSWallpaperFile;
  }

  const next = pickRandomWallpaperFile();
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

export function getSessionWallpaperUrl() {
  return wallpaperUrl(getSessionWallpaperFile());
}
