// Mirrors docs/api-contract.md.

export type ErrorCode =
  | 'not_authenticated'
  | 'invalid_credentials'
  | 'validation_error'
  | 'not_found'
  | 'forbidden_origin'
  | 'internal_error'
  | 'network_error'

export interface ErrorDetail {
  loc?: Array<string | number>
  msg?: string
  [key: string]: unknown
}

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: ErrorDetail[] }
}

export interface LoginRequest {
  username: string
  password: string
}

export interface Session {
  username: string
  expires_at: string
}
