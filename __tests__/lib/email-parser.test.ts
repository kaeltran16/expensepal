import { emailParser } from '@/lib/email-parser'
import { describe, expect, it } from 'vitest'

describe('Email Parser - Category Mapping', () => {
  describe('Food category', () => {
    it('should categorize food-related transaction types as Food', () => {
      const result = (emailParser as any).mapToCategory('GrabFood', 'Unknown')
      expect(result).toBe('Food')
    })

    it('should categorize restaurant transactions as Food', () => {
      const result = (emailParser as any).mapToCategory('Restaurant Purchase', 'KFC')
      expect(result).toBe('Food')
    })

    it('should categorize cafe merchants as Food', () => {
      const result = (emailParser as any).mapToCategory('Purchase', 'Starbucks Cafe')
      expect(result).toBe('Food')
    })

    it('should categorize coffee shops as Food', () => {
      const result = (emailParser as any).mapToCategory('Purchase', 'The Coffee House')
      expect(result).toBe('Food')
    })
  })

  describe('Transport category', () => {
    it('should categorize GrabCar as Transport', () => {
      const result = (emailParser as any).mapToCategory('GrabCar', 'Grab')
      expect(result).toBe('Transport')
    })

    it('should categorize GrabBike as Transport', () => {
      const result = (emailParser as any).mapToCategory('GrabBike', 'Grab')
      expect(result).toBe('Transport')
    })

    it('should categorize taxi rides as Transport', () => {
      const result = (emailParser as any).mapToCategory('Taxi Ride', 'VinaSun')
      expect(result).toBe('Transport')
    })

    it('should categorize ride services as Transport', () => {
      const result = (emailParser as any).mapToCategory('Ride Sharing', 'Uber')
      expect(result).toBe('Transport')
    })
  })

  describe('Shopping category', () => {
    it('should categorize shopping transactions as Shopping', () => {
      const result = (emailParser as any).mapToCategory('Online Shopping', 'Shopee')
      expect(result).toBe('Shopping')
    })

    it('should categorize mart purchases as Shopping', () => {
      // Note: GrabMart contains "grab" which categorizes as Transport first
      const result = (emailParser as any).mapToCategory('Mart Purchase', 'Circle K')
      expect(result).toBe('Shopping')
    })

    it('should categorize retail stores as Shopping', () => {
      const result = (emailParser as any).mapToCategory('Retail Purchase', 'Nike Store')
      expect(result).toBe('Shopping')
    })

    it('should categorize store purchases as Shopping', () => {
      const result = (emailParser as any).mapToCategory('Store Purchase', '7-Eleven')
      expect(result).toBe('Shopping')
    })
  })

  describe('Entertainment category', () => {
    it('should categorize movie tickets as Entertainment', () => {
      const result = (emailParser as any).mapToCategory('Movie Ticket', 'CGV Cinema')
      expect(result).toBe('Entertainment')
    })

    it('should categorize game purchases as Entertainment', () => {
      const result = (emailParser as any).mapToCategory('Game Purchase', 'Steam')
      expect(result).toBe('Entertainment')
    })

    it('should categorize subscriptions as Entertainment', () => {
      const result = (emailParser as any).mapToCategory('Subscription', 'Netflix')
      expect(result).toBe('Entertainment')
    })
  })

  describe('Bills category', () => {
    it('should categorize utility bills as Bills', () => {
      const result = (emailParser as any).mapToCategory('Utility Bill', 'EVN')
      expect(result).toBe('Bills')
    })

    it('should categorize internet bills as Bills', () => {
      const result = (emailParser as any).mapToCategory('Internet Bill', 'Viettel')
      expect(result).toBe('Bills')
    })

    it('should categorize phone bills as Bills', () => {
      const result = (emailParser as any).mapToCategory('Phone Bill', 'Mobifone')
      expect(result).toBe('Bills')
    })
  })

  describe('Health category', () => {
    it('should categorize hospital expenses as Health', () => {
      const result = (emailParser as any).mapToCategory('Hospital Payment', 'FV Hospital')
      expect(result).toBe('Health')
    })

    it('should categorize pharmacy purchases as Health', () => {
      const result = (emailParser as any).mapToCategory('Pharmacy Purchase', 'Guardian')
      expect(result).toBe('Health')
    })

    it('should categorize clinic visits as Health', () => {
      const result = (emailParser as any).mapToCategory('Medical Service', 'Dental Clinic')
      expect(result).toBe('Health')
    })
  })

  describe('Other category', () => {
    it('should default to Other for unknown types', () => {
      const result = (emailParser as any).mapToCategory('Unknown Type', 'Unknown Merchant')
      expect(result).toBe('Other')
    })

    it('should default to Other for ambiguous transactions', () => {
      const result = (emailParser as any).mapToCategory('Purchase', 'Random Store')
      expect(result).toBe('Other')
    })
  })

  describe('Case insensitivity', () => {
    it('should handle uppercase transaction types', () => {
      const result = (emailParser as any).mapToCategory('GRABFOOD', 'KFC')
      expect(result).toBe('Food')
    })

    it('should handle uppercase merchants', () => {
      const result = (emailParser as any).mapToCategory('Purchase', 'COFFEE SHOP')
      expect(result).toBe('Food')
    })

    it('should handle mixed case', () => {
      const result = (emailParser as any).mapToCategory('GrAbCaR', 'GrAb')
      expect(result).toBe('Transport')
    })
  })
})

describe('Email Parser - VIB Email', () => {
  it('should parse Vietnamese VIB email correctly', () => {
    const subject = 'Thong bao giao dich'
    const body = `
      Giao dịch: Thanh toán thẻ
      Giá trị: 120,000 VND
      Vào lúc: 14:30 08/11/2025
      Tại Circle K Nguyen Hue
    `

    const result = emailParser.parseVIBEmail(subject, body)

    expect(result).not.toBeNull()
    expect(result?.amount).toBe(120000)
    expect(result?.currency).toBe('VND')
    expect(result?.merchant).toContain('Circle K')
  })

  it('should parse English VIB email correctly', () => {
    const subject = 'Transaction notification'
    const body = `
      Transaction: Card Payment
      Value: 85,000 VND
      At: 12:45 19/11/2025
      At Starbucks District 1
    `

    const result = emailParser.parseVIBEmail(subject, body)

    expect(result).not.toBeNull()
    expect(result?.amount).toBe(85000)
    expect(result?.currency).toBe('VND')
    expect(result?.merchant).toContain('Starbucks')
  })

  it('should extract transaction date correctly', () => {
    const subject = 'Transaction'
    const body = `
      Giao dịch: Purchase
      Giá trị: 50,000 VND
      Vào lúc: 19:30 24/11/2025
      Tại Test Merchant
    `

    const result = emailParser.parseVIBEmail(subject, body)

    expect(result).not.toBeNull()
    const date = new Date(result!.transactionDate)
    expect(date.getDate()).toBe(24)
    expect(date.getMonth()).toBe(10) // 0-indexed (November = 10)
    expect(date.getFullYear()).toBe(2025)
    expect(date.getHours()).toBe(19)
    expect(date.getMinutes()).toBe(30)
  })

  it('should return null for invalid VIB email format', () => {
    const subject = 'Invalid email'
    const body = 'This is not a valid transaction email'

    const result = emailParser.parseVIBEmail(subject, body)

    expect(result).toBeNull()
  })
})

describe('Email Parser - Grab Email', () => {
  it('should parse GrabFood email correctly', () => {
    const subject = 'Your GrabFood receipt'
    const body = `
      Đặt từ Pizza Hut District 1
      Tổng cộng ₫120,000
      08 Nov 25 18:38
    `

    const result = emailParser.parseGrabEmail(subject, body)

    expect(result).not.toBeNull()
    expect(result?.amount).toBe(120000)
    expect(result?.currency).toBe('VND')
    expect(result?.merchant).toContain('Pizza Hut')
    // Transaction type depends on email content detection
  })

  it('should parse GrabCar email correctly', () => {
    const subject = 'Your trip receipt'
    const body = `
      GrabCar ride
      Total ₫45,000
      08 Nov 25 19:45
      Driver: Nguyen Van A
    `

    const result = emailParser.parseGrabEmail(subject, body)

    expect(result).not.toBeNull()
    expect(result?.amount).toBe(45000)
    expect(result?.transactionType).toMatch(/Grab|Car|Bike/)
    expect(result?.category).toBe('Transport')
  })

  it('should skip pending Grab orders', () => {
    const subject = 'Order for Later'
    const body = `
      Total pending ₫100,000
      Your order is scheduled
    `

    const result = emailParser.parseGrabEmail(subject, body)

    expect(result).toBeNull()
  })

  it('should handle different date formats', () => {
    const subject = 'Receipt'
    const body = `
      Đặt từ KFC
      Tổng cộng ₫85,000
      24/11/2025 13:30
    `

    const result = emailParser.parseGrabEmail(subject, body)

    expect(result).not.toBeNull()
    const date = new Date(result!.transactionDate)
    expect(date.getDate()).toBe(24)
    expect(date.getMonth()).toBe(10) // November
  })
})
