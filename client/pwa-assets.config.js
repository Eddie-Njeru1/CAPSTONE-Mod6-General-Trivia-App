// Settings for `npm run generate-pwa-assets`.
// Makes every app icon size (phone home screen, Android, iPhone, browser tab)
// from the one drawing in public/icons/icon.svg.

import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // The purple behind the icon when a phone adds padding or crops it.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#6c63ff' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#6c63ff' } },
  },
  images: ['public/icons/icon.svg'],
})
