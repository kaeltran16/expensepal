import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase
const mockSettingsSelect = vi.fn()
const mockSettingsUpsert = vi.fn()
const mockSettingsDelete = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'user_email_settings') {
        const queryBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockSettingsUpsert,
            })),
          })),
          delete: vi.fn(() => ({
            eq: mockSettingsDelete,
          })),
          then: (resolve: any) => resolve(mockSettingsSelect()),
        }
        return queryBuilder
      }
      return {}
    }),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
  })),
}))

describe('Email Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset env var for consistent encryption testing if needed
    process.env.EMAIL_ENCRYPTION_KEY = 'test-key-must-be-32-bytes-long-!!'
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('GET /api/settings/email', () => {
    it('should return decrypted settings for authenticated user', async () => {
      // Mock encrypted data in DB
      const crypto = await import('crypto')
      const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-please-change-in-production!!!'
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
      let encrypted = cipher.update('my-secret-password', 'utf8', 'hex')
      encrypted += cipher.final('hex')
      const storedPassword = iv.toString('hex') + ':' + encrypted

      mockSettingsSelect.mockResolvedValue({
        data: {
          user_id: 'test-user-id',
          email_address: 'test@example.com',
          app_password: storedPassword,
          imap_host: 'imap.gmail.com',
        },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/settings/email')
      const { GET } = await import('@/app/api/settings/email/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.email_address).toBe('test@example.com')
      expect(data.app_password).toBe('my-secret-password')
    })

    it('should return null if no settings found', async () => {
      mockSettingsSelect.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const request = new NextRequest('http://localhost:3000/api/settings/email')
      const { GET } = await import('@/app/api/settings/email/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toBeNull()
    })
  })

  describe('POST /api/settings/email', () => {
    it('should encrypt password and save settings', async () => {
      const payload = {
        email_address: 'new@example.com',
        app_password: 'new-password',
        imap_host: 'imap.test.com',
      }

      // Generate valid encrypted password using the same logic as the route
      const crypto = await import('crypto')
      const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-please-change-in-production!!!'
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
      let encrypted = cipher.update('new-password', 'utf8', 'hex')
      encrypted += cipher.final('hex')
      const validEncrypted = iv.toString('hex') + ':' + encrypted
      
      mockSettingsUpsert.mockResolvedValue({
        data: {
          ...payload,
          app_password: validEncrypted
        },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/settings/email', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const { POST } = await import('@/app/api/settings/email/route')
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.app_password).toBe('new-password')
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings/email', {
        method: 'POST',
        body: JSON.stringify({ email_address: '' }), // Missing password
      })

      const { POST } = await import('@/app/api/settings/email/route')
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/settings/email', () => {
    it('should delete settings', async () => {
      mockSettingsDelete.mockResolvedValue({
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/settings/email', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/settings/email/route')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSettingsDelete).toHaveBeenCalled()
    })
  })
})
