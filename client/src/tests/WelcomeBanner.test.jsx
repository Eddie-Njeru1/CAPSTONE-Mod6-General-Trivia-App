import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { useAuthMock, useScoreMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useScoreMock: vi.fn(),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: useAuthMock,
}))

vi.mock('../context/useScore', () => ({
  useScore: useScoreMock,
}))

import WelcomeBanner from '../components/WelcomeBanner'

describe('WelcomeBanner', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
    useScoreMock.mockReset()
  })

  it('displays the logged-in user name', () => {
    useAuthMock.mockReturnValue({
      user: { username: 'Sandra' },
    })
    useScoreMock.mockReturnValue({ bestStreak: 5 })

    render(<WelcomeBanner />)

    expect(screen.getByText('Hello, Sandra!')).toBeInTheDocument()
  })

  it('uses the email when the username is unavailable', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'player@example.com' },
    })
    useScoreMock.mockReturnValue({ bestStreak: 3 })

    render(<WelcomeBanner />)

    expect(screen.getByText('Hello, player@example.com!')).toBeInTheDocument()
  })

  it('uses Player when no user details are available', () => {
    useAuthMock.mockReturnValue({ user: null })
    useScoreMock.mockReturnValue({ bestStreak: 0 })

    render(<WelcomeBanner />)

    expect(screen.getByText('Hello, Player!')).toBeInTheDocument()
  })

  it('displays the best streak', () => {
    useAuthMock.mockReturnValue({
      user: { username: 'Sandra' },
    })
    useScoreMock.mockReturnValue({ bestStreak: 7 })

    render(<WelcomeBanner />)

    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('answers')).toBeInTheDocument()
  })

  it('uses the singular word answer for a streak of one', () => {
    useAuthMock.mockReturnValue({
      user: { username: 'Sandra' },
    })
    useScoreMock.mockReturnValue({ bestStreak: 1 })

    render(<WelcomeBanner />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('answer')).toBeInTheDocument()
  })
})