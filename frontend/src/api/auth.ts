import { request } from './client'
import type { LoginRequest, Session } from './types'

export function login(credentials: LoginRequest): Promise<Session> {
  return request<Session>('/auth/login', {
    method: 'POST',
    body: credentials,
    skipUnauthorizedHandler: true,
  })
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST', skipUnauthorizedHandler: true })
}

export function getMe(): Promise<Session> {
  return request<Session>('/auth/me', { skipUnauthorizedHandler: true })
}
