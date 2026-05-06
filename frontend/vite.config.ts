import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SITE_URL = 'https://romaneiorapido.com.br'
const DEFAULT_OG_IMAGE = `${SITE_URL}/login-warehouse-1200.jpg`

type RouteMeta = {
  path: string
  title: string
  description: string
  noindex?: boolean
}

const PRERENDER_ROUTES: RouteMeta[] = [
  {
    path: '/login',
    title: 'Entrar | Romaneio Rápido',
    description: 'Acesse o Romaneio Rápido para emitir romaneios, controlar estoque e organizar saídas. Plataforma 100% web.'
  },
  {
    path: '/termos',
    title: 'Termos de Uso | Romaneio Rápido',
    description: 'Termos de Uso do Romaneio Rápido — sistema web para emissão de romaneios e controle de estoque.'
  },
  {
    path: '/privacidade',
    title: 'Política de Privacidade | Romaneio Rápido',
    description: 'Política de Privacidade do Romaneio Rápido — como coletamos, usamos e protegemos seus dados.'
  },
  {
    path: '/cookies',
    title: 'Política de Cookies | Romaneio Rápido',
    description: 'Política de Cookies do Romaneio Rápido — como utilizamos cookies para melhorar sua experiência.'
  }
]

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function rewriteHead(html: string, route: RouteMeta): string {
  const url = `${SITE_URL}${route.path}`
  const title = escapeHtml(route.title)
  const desc = escapeHtml(route.description)
  const robots = route.noindex
    ? 'noindex,nofollow'
    : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'

  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
  out = out.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${desc}" />`
  )
  out = out.replace(
    /<meta name="robots"[^>]*>/,
    `<meta name="robots" content="${robots}" />`
  )
  out = out.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${url}" />`
  )
  out = out.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${url}" />`
  )
  out = out.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${title}" />`
  )
  out = out.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${desc}" />`
  )
  out = out.replace(
    /<meta property="og:image" content="[^"]*"[^>]*>/,
    `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />`
  )
  out = out.replace(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${title}" />`
  )
  out = out.replace(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${desc}" />`
  )
  return out
}

function staticRoutesPlugin(): Plugin {
  const projectRoot = fileURLToPath(new URL('./', import.meta.url))
  return {
    name: 'romaneio-static-routes',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(projectRoot, 'dist')
      const indexPath = resolve(outDir, 'index.html')
      let baseHtml: string
      try {
        baseHtml = readFileSync(indexPath, 'utf8')
      } catch {
        return
      }

      for (const route of PRERENDER_ROUTES) {
        const targetDir = resolve(outDir, '.' + route.path)
        const targetFile = resolve(targetDir, 'index.html')
        try {
          mkdirSync(targetDir, { recursive: true })
          writeFileSync(targetFile, rewriteHead(baseHtml, route), 'utf8')
        } catch (err) {
          this.warn(`Failed to write static route ${route.path}: ${(err as Error).message}`)
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), staticRoutesPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion', 'react-hot-toast'],
          'qr-vendor': ['html5-qrcode', 'qrcode']
        }
      }
    }
  },
  server: {
    host: true,
    allowedHosts: ['romaneiorapido.com.br', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://backend:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
