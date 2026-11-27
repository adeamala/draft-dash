import { defineConfig } from 'vite'

// Relative asset paths so the same build works on GitHub Pages (/draft-dash/) and from a local booth preview.
export default defineConfig({ base: './' })
