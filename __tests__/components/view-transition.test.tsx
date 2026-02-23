import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ViewTransition } from '@/components/view-transition'

describe('ViewTransition', () => {
  it('should render children', () => {
    render(
      <ViewTransition activeView="expenses">
        <div>Expenses Content</div>
      </ViewTransition>
    )

    expect(screen.getByText('Expenses Content')).toBeInTheDocument()
  })

  it('should re-render with new children when activeView changes', () => {
    const { rerender } = render(
      <ViewTransition activeView="expenses">
        <div>Expenses Content</div>
      </ViewTransition>
    )

    rerender(
      <ViewTransition activeView="budget">
        <div>Budget Content</div>
      </ViewTransition>
    )

    expect(screen.getByText('Budget Content')).toBeInTheDocument()
  })

  it('should set data-view attribute on wrapper', () => {
    const { container } = render(
      <ViewTransition activeView="goals">
        <div>Goals Content</div>
      </ViewTransition>
    )

    expect(container.querySelector('[data-view="goals"]')).toBeInTheDocument()
  })
})
