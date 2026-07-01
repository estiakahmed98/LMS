import { mockUsers, type User } from './mock-data'

// TODO: replace with a real session lookup once auth is wired up.
const CURRENT_USER_ID = 'user_1'

export function getCurrentUser(): User | undefined {
  return mockUsers.find((u) => u.id === CURRENT_USER_ID)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
