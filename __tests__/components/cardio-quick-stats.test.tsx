import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardioQuickStats } from '@/components/workouts/CardioQuickStats'

describe('CardioQuickStats', () => {
  it('renders three stat cards', () => {
    render(<CardioQuickStats totalDistance={12.4} avgSpeed={9.2} totalMinutes={85} />)
    expect(screen.getByText('km')).toBeDefined()
    expect(screen.getByText('pace')).toBeDefined()
    expect(screen.getByText('min')).toBeDefined()
  })

  it('renders zeros when no data', () => {
    render(<CardioQuickStats totalDistance={0} avgSpeed={0} totalMinutes={0} />)
    expect(screen.getByText('km')).toBeDefined()
  })
})
