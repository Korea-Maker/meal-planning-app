const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: RequestMethod
  body?: unknown
  headers?: Record<string, string>
}

interface ApiError {
  success: false
  error: string
  code: string
  details?: Record<string, unknown>
}

class ApiHttpError extends Error {
  status: number
  code: string
  details?: Record<string, unknown>

  constructor(message: string, status: number, code: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshPromise: Promise<boolean> | null = null
  private onAuthFailure: (() => void) | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  getAccessToken() {
    return this.accessToken
  }

  setOnAuthFailure(callback: () => void) {
    this.onAuthFailure = callback
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })

    if (response.status === 401 && !isRetry && !endpoint.includes('/auth/')) {
      const refreshed = await this.tryRefreshToken()
      if (refreshed) {
        return this.request<T>(endpoint, options, true)
      }
      if (this.onAuthFailure) {
        this.onAuthFailure()
      }
      throw new ApiHttpError('Session expired', 401, 'AUTH_EXPIRED')
    }

    if (!response.ok) {
      const error = (await response.json()) as ApiError
      throw new ApiHttpError(
        error.error || 'Request failed',
        response.status,
        error.code,
        error.details
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  private async tryRefreshToken(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this._doRefresh()
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async _doRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) return false

      const result = await response.json()
      const newAccessToken = result.data?.access_token
      if (newAccessToken) {
        this.accessToken = newAccessToken
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async silentRefresh(): Promise<boolean> {
    return this.tryRefreshToken()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body })
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient(API_URL)
