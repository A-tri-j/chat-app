import { useState, useEffect } from 'react'
import api from '../api'
import { getAvatarUrl, formatLastSeen } from '../utils/avatarHelper'
import useStore from '../store'

export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blockStatus, setBlockStatus] = useState({
    i_blocked_them: false,
    they_blocked_me: false
  })
  const [blockLoading, setBlockLoading] = useState(false)

  useEffect(() => {
    loadProfile()
    loadBlockStatus()
  }, [userId])

  const loadProfile = async () => {
    try {
      const res = await api.get(`/users/${userId}`)
      setProfile(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadBlockStatus = async () => {
    try {
      const res = await api.get(`/users/is-blocked/${userId}`)
      setBlockStatus(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleBlock = async () => {
    setBlockLoading(true)
    try {
      if (blockStatus.i_blocked_them) {
        await api.post('/users/unblock', { blocked_id: userId })
        setBlockStatus({ ...blockStatus, i_blocked_them: false })
      } else {
        await api.post('/users/block', { blocked_id: userId })
        setBlockStatus({ ...blockStatus, i_blocked_them: true })
      }

      // Reload chats to update UI instantly!
      api.get('/chats/').then((res) => {
        const { setChats, activeChat, setActiveChat } = useStore.getState()
        setChats(res.data)
        if (activeChat && activeChat.other_user?.id === userId) {
          const updatedChat = res.data.find(c => c.room_id === activeChat.room_id)
          if (updatedChat) setActiveChat(updatedChat)
        }
      })
    } catch (err) {
      alert(err.response?.data?.detail || 'Action failed')
    } finally {
      setBlockLoading(false)
    }
  }

  const avatarUrl = getAvatarUrl(profile?.avatar_url)

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : profile ? (
          <>
            <div style={styles.avatarSection}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.username}
                  style={styles.avatar} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {profile.username?.[0]?.toUpperCase()}
                </div>
              )}
              {profile.is_online && (
                <div style={styles.onlineBadge}>Online</div>
              )}
            </div>

            <div style={styles.info}>
              <h3 style={styles.username}>{profile.username}</h3>

              {profile.bio ? (
                <p style={styles.bio}>{profile.bio}</p>
              ) : (
                <p style={styles.noBio}>No bio yet</p>
              )}

              <p style={styles.lastSeen}>
                {profile.is_online
                  ? '🟢 Currently online'
                  : formatLastSeen(profile.last_seen)}
              </p>

              {/* Block status warning */}
              {blockStatus.they_blocked_me && (
                <p style={styles.blockedWarning}>
                  🚫 This user has blocked you
                </p>
              )}

              {/* Block / Unblock button */}
              <button
                style={{
                  ...styles.blockBtn,
                  backgroundColor: blockStatus.i_blocked_them
                    ? '#e8f5e9'
                    : '#ffebee',
                  color: blockStatus.i_blocked_them
                    ? '#2e7d32'
                    : '#c62828',
                  borderColor: blockStatus.i_blocked_them
                    ? '#a5d6a7'
                    : '#ef9a9a'
                }}
                onClick={handleBlock}
                disabled={blockLoading}
              >
                {blockLoading
                  ? 'Please wait...'
                  : blockStatus.i_blocked_them
                  ? '✅ Unblock User'
                  : '🚫 Block User'}
              </button>
            </div>
          </>
        ) : (
          <p style={styles.loading}>User not found</p>
        )}
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
    zIndex: 200,
    padding: 16
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    position: 'relative',
    paddingBottom: 24
  },
  closeBtn: {
    position: 'absolute',
    top: 12, right: 12,
    background: 'rgba(0,0,0,0.3)',
    border: 'none',
    color: 'white',
    width: 28, height: 28,
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: 13,
    zIndex: 10
  },
  avatarSection: {
    backgroundColor: '#075e54',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px 24px'
  },
  avatar: {
    width: 90, height: 90,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid white'
  },
  avatarPlaceholder: {
    width: 90, height: 90,
    borderRadius: '50%',
    backgroundColor: '#25d366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 34,
    fontWeight: 'bold',
    border: '3px solid white'
  },
  onlineBadge: {
    marginTop: 10,
    backgroundColor: '#25d366',
    color: 'white',
    fontSize: 12,
    padding: '3px 12px',
    borderRadius: 12,
    fontWeight: '600'
  },
  info: {
    padding: '20px 24px 0',
    textAlign: 'center'
  },
  username: {
    margin: '0 0 8px',
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  bio: {
    margin: '0 0 12px',
    fontSize: 14,
    color: '#555',
    lineHeight: 1.5
  },
  noBio: {
    margin: '0 0 12px',
    fontSize: 14,
    color: '#bbb',
    fontStyle: 'italic'
  },
  lastSeen: {
    margin: '0 0 16px',
    fontSize: 12,
    color: '#999'
  },
  blockedWarning: {
    margin: '0 0 12px',
    fontSize: 13,
    color: '#c62828',
    backgroundColor: '#ffebee',
    padding: '8px 12px',
    borderRadius: 8
  },
  blockBtn: {
    width: '100%',
    padding: '10px',
    border: '1px solid',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: '600',
    marginTop: 4
  },
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#888'
  }
}