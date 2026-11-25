// Public installer links for /download. Set a URL only when a real, public
// installer exists at it (a published release). While a value is null the
// page shows the platform as "Coming soon" with a disabled button.
export const DESKTOP_DOWNLOADS: { windows: string | null; macos: string | null } = {
  windows:
    'https://github.com/Mrghost6337/clipfarm-studio-releases/releases/download/v0.1.0-beta.1/Clipfarm-Studio-Setup-0.1.0-beta.1.exe',
  macos: null,
}
