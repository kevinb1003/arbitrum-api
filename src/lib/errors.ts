import { ErrorCode } from '../types/api'

export class SDKError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SDKError'
  }
}
