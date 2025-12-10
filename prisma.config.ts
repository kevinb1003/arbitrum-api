import { defineConfig, env } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: './src/lib/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
