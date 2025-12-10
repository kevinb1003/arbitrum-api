import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      exclude: [
        'src/lib/**',
        'src/constants.ts',
        'src/test/**',
        'src/validation/**',
      ],
    },
  },
})
