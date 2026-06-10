import { useState, useEffect } from 'react'
import {
  requestNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled
} from '../utils/notifications'

export default function NotificationSettings({ onClose }) {
  const [enabled, setEnabled] = useState(isNotificationEnabled())
  const [permission, setPermission] = useState(Notification.permission)
  const [requesting, setRequesting] = useState(false)

  const handleToggle = async () => {
    if (!enabled) {
      // turning on — request permission if needed
      if (permission !== 'granted') {
        setRequesting(true)
        const granted = await requestNotificationPermission()
        setRequesting(false)
        setPermission(Notification.permission)
        if (!granted) return
      }
    }
    const newVal = !enabled
    setEnabled(newVal)
    setNotificationEnabled(newVal)
  }

  const handleRequestPermission = async () => {
    setRequesting(true)
    await requestNotificationPermission()
    setPermission(Notification.permission)
    setRequesting(false)
  }

  const sendTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification 🔔', {
        body: 'Notifications are working!',
        tag: 'test'
      })
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>🔔 Notification Settings</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Permission status */}
        <div style={styles.section}>
          <div style={styles.row}>
            <span style={styles.label}>Browser Permission</span>
            <span style={{
              ...styles.badge,
              backgroundColor:
                permission === 'granted' ? '#e8f5e9' :
                permission === 'denied' ? '#ffebee' : '#fff3e0',
              color:
                permission === 'granted' ? '#2e7d32' :
                permission === 'denied' ? '#c62828' : '#e65100'
            }}>
              {permission === 'granted' ? '✅ Allowed' :
               permission === 'denied' ? '🚫 Blocked' : '⚠️ Not set'}
            </span>
          </div>

          {permission === 'denied' && (
            <p style={styles.deniedNote}>
              You have blocked notifications. Please allow them in your browser settings manually.
            </p>
          )}

          {permission === 'default' && (
            <button
              style={styles.permBtn}
              onClick={handleRequestPermission}
              disabled={requesting}
            >
              {requesting ? 'Requesting...' : '🔔 Allow Notifications'}
            </button>
          )}
        </div>

        {/* Enable / Disable toggle */}
        <div style={styles.section}>
          <div style={styles.row}>
            <div>
              <p style={styles.settingTitle}>Message Notifications</p>
              <p style={styles.settingDesc}>
                Show notification when you receive a message
              </p>
            </div>
            <div
              style={{
                ...styles.toggle,
                backgroundColor: enabled && permission === 'granted'
                  ? '#25d366'
                  : '#ccc'
              }}
              onClick={handleToggle}
            >
              <div style={{
                ...styles.toggleThumb,
                transform: enabled && permission === 'granted'
                  ? 'translateX(22px)'
                  : 'translateX(2px)'
              }} />
            </div>
          </div>
        </div>

        {/* Call notifications info */}
        <div style={styles.section}>
          <div style={styles.row}>
            <div>
              <p style={styles.settingTitle}>Call Notifications</p>
              <p style={styles.settingDesc}>
                Show notification for incoming calls
              </p>
            </div>
            <div style={{
              ...styles.toggle,
              backgroundColor: permission === 'granted' ? '#25d366' : '#ccc'
            }}>
              <div style={{
                ...styles.toggleThumb,
                transform: permission === 'granted'
                  ? 'translateX(22px)'
                  : 'translateX(2px)'
              }} />
            </div>
          </div>
        </div>

        {/* Test button */}
        {permission === 'granted' && (
          <div style={styles.section}>
            <button
              style={styles.testBtn}
              onClick={sendTestNotification}
            >
              🔔 Send Test Notification
            </button>
          </div>
        )}

        {/* Info */}
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            💡 Notifications only appear when the browser tab is not focused.
            They work even when you are in another tab.
          </p>
        </div>

      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    padding: 16
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#075e54'
  },
  title: {
    margin: 0,
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: 18,
    cursor: 'pointer'
  },
  section: {
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0'
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  label: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600'
  },
  deniedNote: {
    margin: '10px 0 0',
    fontSize: 12,
    color: '#c62828',
    lineHeight: 1.5
  },
  permBtn: {
    marginTop: 12,
    width: '100%',
    padding: '10px',
    backgroundColor: '#075e54',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: '600'
  },
  settingTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  settingDesc: {
    margin: '3px 0 0',
    fontSize: 12,
    color: '#888'
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.2s'
  },
  toggleThumb: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s'
  },
  testBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f0f2f5',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    color: '#075e54',
    fontWeight: '600'
  },
  infoBox: {
    padding: '12px 20px 16px'
  },
  infoText: {
    margin: 0,
    fontSize: 12,
    color: '#888',
    lineHeight: 1.6
  }
}