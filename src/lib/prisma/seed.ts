import { Prisma, PrismaClient } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: pool })

const apiKeys: Prisma.ApiKeyCreateInput[] = [
  {
    key: 'f1ed5fb7-9499-4989-acea-93168ba8ed82',
  },
]

const main = async () => {
  console.log('Starting seed...')

  for (const apiKey of apiKeys) {
    const created = await prisma.apiKey.upsert({
      where: { key: apiKey.key },
      update: {},
      create: apiKey,
    })
    console.log(`Seeded API key: ${created.key}`)
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(`Seed failed: ${e.message}`)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
