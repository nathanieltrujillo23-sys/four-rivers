import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serves /api/bible while developing (on Vercel it is the serverless
// function in api/bible.ts). Keys come from .env.local.
function bibleApi(env: Record<string, string>): Plugin {
  return {
    name: 'bible-api-dev',
    configureServer(server) {
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
}))
