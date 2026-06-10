export const formatMessageTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatChatTime = (dateStr) => {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()

  const isToday = date.toDateString() === now.toDateString()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const oneWeekAgo = new Date(now)
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const isThisWeek = date > oneWeekAgo

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (isYesterday) {
    return 'Yesterday'
  } else if (isThisWeek) {
    return date.toLocaleDateString([], { weekday: 'short' })
  } else {
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }
}