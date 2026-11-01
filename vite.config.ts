import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Relative base works for GitHub Pages project subpaths and local previews.
export default defineConfig({plugins:[react()],base:'./'})
