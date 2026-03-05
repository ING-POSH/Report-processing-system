import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  organization: JSON.parse(localStorage.getItem('organization') || 'null'),
  spaces: JSON.parse(localStorage.getItem('spaces') || '[]'),

  setAuth: (token, user, organization, spaces = []) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('organization', JSON.stringify(organization))
    localStorage.setItem('spaces', JSON.stringify(spaces))
    set({ token, user, organization, spaces })
  },

  logout: () => {
    localStorage.clear()
    set({ token: null, user: null, organization: null, spaces: [] })
  },

  getSpace: (type) => {
    const spaces = JSON.parse(localStorage.getItem('spaces') || '[]')
    return spaces.find(s => s.space_type === type) || null
  },

  isAuthenticated: () => !!localStorage.getItem('token'),
}))

export default useAuthStore
