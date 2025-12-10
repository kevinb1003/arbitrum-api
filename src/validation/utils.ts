import { create, Struct } from 'superstruct'

export const validate = <T, S>(schema: Struct<T, S>, payload: unknown): T =>
  create(payload, schema) as T
