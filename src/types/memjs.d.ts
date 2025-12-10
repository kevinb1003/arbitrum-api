declare module 'memjs' {
  export type Client = {
    get: (key: string) => Promise<Buffer | null>
    set: (
      key: string,
      value: Buffer,
      options: { expires: number }
    ) => Promise<void>
  }

  export const Client: {
    create: (servers?: string) => Client
  }

  const memjs: {
    Client: typeof Client
  }

  export default memjs
}
