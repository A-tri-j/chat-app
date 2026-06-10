const BASE_URL = 'http://localhost:8000'

export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http')) return avatarUrl
  return `${BASE_URL}${avatarUrl}`
}

export const getInitial = (name) => {
  if (!name) return '?'
  return name[0].toUpperCase()
}

export const formatLastSeen = (lastSeenStr) => {
  if (!lastSeenStr) return 'Last seen a while ago'

  const date = new Date(lastSeenStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Last seen just now'
  if (diffMins < 60) return `Last seen ${diffMins}m ago`
  if (diffHours < 24) return `Last seen ${diffHours}h ago`
  if (diffDays === 1) return 'Last seen yesterday'
  return `Last seen ${date.toLocaleDateString()}`
}