// notification permission state
let permission = 'default'

// request permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    permission = 'granted'
    return true
  }

  if (Notification.permission !== 'denied') {
    const result = await Notification.requestPermission()
    permission = result
    return result === 'granted'
  }

  return false
}

// show notification
export const showNotification = (title, body, icon, onClick) => {
  // check localStorage setting
  const notifEnabled = localStorage.getItem('notif_enabled')
  if (notifEnabled === 'false') return

  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  // don't show if tab is focused
  if (document.hasFocus()) return

  try {
    const notif = new Notification(title, {
      body,
      icon: icon || '/chat-icon.png',
      badge: '/chat-icon.png',
      tag: 'chat-message',
      renotify: true
    })

    notif.onclick = () => {
      window.focus()
      notif.close()
      if (onClick) onClick()
    }

    // auto close after 5 seconds
    setTimeout(() => notif.close(), 5000)
  } catch (err) {
    console.error('Notification error:', err)
  }
}

// show call notification
export const showCallNotification = (callerName, callType, onAccept, onReject) => {
  const notifEnabled = localStorage.getItem('notif_enabled')
  if (notifEnabled === 'false') return

  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const notif = new Notification(
      `${callType === 'video' ? '📹' : '📞'} Incoming ${callType} call`,
      {
        body: `${callerName} is calling you`,
        tag: 'incoming-call',
        requireInteraction: true
      }
    )

    notif.onclick = () => {
      window.focus()
      notif.close()
    }
  } catch (err) {
    console.error('Call notification error:', err)
  }
}

export const isNotificationEnabled = () => {
  return localStorage.getItem('notif_enabled') !== 'false'
}

export const setNotificationEnabled = (val) => {
  localStorage.setItem('notif_enabled', val ? 'true' : 'false')
}