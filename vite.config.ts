import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serves /api/bible and /api/data while developing (on Vercel they are the
// serverless functions in api/). Keys come from .env.local.
function bibleApi(env: Record<string, string>): Plugin {
  return {
    name: 'bible-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/data', async (req, res) => {
        const { runData } = await server.ssrLoadModule('/api/data.ts')
        const params = new URL(req.url ?? '', 'http://localhost').searchParams
        const out = await runData(params, env)
        res.statusCode = out.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(out.body))
      })
      server.middlewares.use('/api/bible', async (req, res) => {
        const { runBible } = await server.ssrLoadModule('/api/bible.ts')
        const params = new URL(req.url ?? '', 'http://localhost').searchParams
        const out = await runBible(params, req.headers.authorization, env)
        res.statusCode = out.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(out.body))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), bibleApi(loadEnv(mode, process.cwd(), ''))],
  server: {
    port: Number(process.env.PORT) || 5273,
  },
  // The two export libraries are loaded on demand. Bundling them when the dev server starts keeps the first export from
  // triggering a re-bundle and a page reload.
  optimizeDeps: {
    include: ['exceljs', 'pptxgenjs'],
  },
}))
