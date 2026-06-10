import { useState, useEffect } from 'react'
import api from '../api'
import useStore from '../store'
import { formatChatTime } from '../utils/timeFormat'
import CreateGroupModal from './CreateGroupModal'
import NotificationSettings from './NotificationSettings'
import { useNavigate } from 'react-router-dom'

export default function Sidebar({ onChatOpen, isMobile }) {
  const {
    chats, setChats,
    activeChat, setActiveChat,
    setMessages, user
  } = useStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()
  const logout = useStore((s) => s.logout)

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    try {
      const res = await api.get('/chats/')
      setChats(res.data)
    } catch (err) {
      console.error('Failed to load chats', err)
    }
  }

  const handleSearch = async (e) => {
    const value = e.target.value
    setSearchQuery(value)

    if (value.trim().length === 0) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    try {
      const res = await api.get(`/users/search?q=${value}`)
      setSearchResults(res.data)
    } catch (err) {
      console.error('Search failed', err)
    }
  }

  const startChat = async (userId) => {
    try {
      await api.post('/chats/', { receiver_id: userId })
      setSearchQuery('')
      setSearchResults([])
      setSearching(false)
      loadChats()
    } catch (err) {
      console.error('Failed to start chat', err)
    }
  }

  const openChat = async (chat) => {
    setActiveChat(chat)
    if (onChatOpen) onChatOpen()  // hide sidebar on mobile
    try {
      const res = await api.get(`/chats/${chat.room_id}/messages`)
      setMessages(res.data)

      await api.put(`/chats/${chat.room_id}/seen`)

      const updatedChats = useStore.getState().chats.map((c) => {
        if (c.room_id === chat.room_id) {
          return { ...c, unread_count: 0 }
        }
        return c
      })
      setChats(updatedChats)
    } catch (err) {
      console.error('Failed to load messages', err)
    }
  }

  // decide avatar letter — group shows first letter of group name
  const getChatAvatar = (chat) => {
    if (chat.is_group) return chat.group_name?.[0]?.toUpperCase() || 'G'
    return chat.other_user?.username?.[0]?.toUpperCase() || '?'
  }

  // decide display name — group name or other user name
  const getChatName = (chat) => {
    if (chat.is_group) return chat.group_name
    return chat.other_user?.username
  }

  // last message preview text
  const getLastMessage = (chat) => {
    if (!chat.last_message) return 'No messages yet'
    if (chat.is_group) return chat.last_message
    return chat.last_message
  }

  return (
    <div style={{ ...styles.sidebar, width: '100%' }}>

      {/* Header */}
      <div style={styles.header}>
        <div
          style={{ ...styles.avatar, cursor: 'pointer' }}
          onClick={() => navigate('/profile')}
          title="My Profile"
        >
          {user?.avatar_url ? (
            <img
              src={`http://localhost:8000${user.avatar_url}`}
              alt="avatar"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            user?.username?.[0]?.toUpperCase()
          )}
        </div>

        <span style={styles.headerName}>{user?.username}</span>

        {/* New Group Button */}
        <button
          onClick={() => setShowGroupModal(true)}
          style={styles.groupBtn}
          title="New Group"
        >
          👥
        </button>

        {/* Logout Button */}
        <button
          onClick={() => { logout(); window.location.href = '/login' }}
          style={styles.logoutBtn}
        >
          Logout
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          style={styles.settingsBtn}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <input
          style={styles.searchInput}
          placeholder="Search users to chat..."
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>

      {/* Search Results */}
      {searching && (
        <div style={styles.list}>
          {searchResults.length === 0 ? (
            <p style={styles.emptyText}>No users found</p>
          ) : (
            searchResults.map((u) => (
              <div
                key={u.id}
                style={styles.searchItem}
                onClick={() => startChat(u.id)}
              >
                <div style={styles.smallAvatar}>
                  {u.username[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 14 }}>{u.username}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Chat List */}
      {!searching && (
        <div style={styles.list}>
          {chats.length === 0 ? (
            <p style={styles.emptyText}>
              No chats yet. Search a user above.
            </p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.room_id}
                style={{
                  ...styles.chatItem,
                  backgroundColor:
                    activeChat?.room_id === chat.room_id
                      ? '#d9fdd3'
                      : 'white'
                }}
                onClick={() => openChat(chat)}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    ...styles.smallAvatar,
                    backgroundColor: chat.is_group ? '#1565c0' : '#075e54',
                    overflow: 'hidden',
                    padding: 0
                  }}>
                    {!chat.is_group && chat.other_user?.avatar_url ? (
                      <img
                        src={`http://localhost:8000${chat.other_user.avatar_url}`}
                        alt={chat.other_user.username}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      getChatAvatar(chat)
                    )}
                  </div>

                  {/* Online dot — only for direct chats (backend hides when blocked) */}
                  {!chat.is_group && chat.other_user?.is_online && (
                    <div style={styles.onlineDot} />
                  )}

                  {/* Group icon badge */}
                  {chat.is_group && (
                    <div style={styles.groupDot}>👥</div>
                  )}
                </div>

                {/* Chat Info */}
                <div style={styles.chatInfo}>
                  <div style={styles.chatTopRow}>
                    <span style={{
                      ...styles.chatName,
                      fontWeight: chat.unread_count > 0 ? '700' : '600'
                    }}>
                      {getChatName(chat)}
                    </span>
                    <span style={{
                      ...styles.chatTime,
                      color: chat.unread_count > 0 ? '#25d366' : '#999',
                      fontWeight: chat.unread_count > 0 ? '600' : 'normal'
                    }}>
                      {formatChatTime(chat.last_message_time)}
                    </span>
                  </div>
                  <div style={styles.chatBottomRow}>
                    <span style={{
                      ...styles.lastMessage,
                      fontWeight: chat.unread_count > 0 ? '600' : 'normal',
                      color: chat.unread_count > 0 ? '#111' : '#888'
                    }}>
                      {getLastMessage(chat)}
                    </span>
                    {chat.unread_count > 0 && (
                      <div style={styles.badge}>
                        {chat.unread_count > 99 ? '99+' : chat.unread_count}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={loadChats}
        />
      )}

      {showSettings && (
        <NotificationSettings
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  )
}

const styles = {
  sidebar: {
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: 'white',
    flexShrink: 0
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#075e54',
    gap: 8
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#25d366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    flexShrink: 0,
    overflow: 'hidden'
  },
  headerName: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  groupBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px',
    borderRadius: 6,
    lineHeight: 1
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.4)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    flexShrink: 0
  },
  settingsBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0
  },
  searchContainer: {
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0'
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '24px',
    border: '1px solid #ddd',
    fontSize: 14,
    backgroundColor: '#f0f2f5',
    boxSizing: 'border-box',
    outline: 'none'
  },
  list: {
    flex: 1,
    overflowY: 'auto'
  },
  searchItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    gap: 12,
    borderBottom: '1px solid #f5f5f5'
  },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f5f5f5',
    gap: 12
  },
  smallAvatar: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#25d366',
    border: '2px solid white',
    position: 'absolute',
    bottom: 0,
    right: 0
  },
  groupDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 12,
    lineHeight: 1
  },
  chatInfo: {
    flex: 1,
    overflow: 'hidden'
  },
  chatTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  chatTime: {
    fontSize: 11,
    color: '#999'
  },
  chatBottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  badge: {
    backgroundColor: '#25d366',
    color: 'white',
    borderRadius: '50%',
    minWidth: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    padding: '0 5px',
    flexShrink: 0
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: '30px 20px',
    fontSize: 14
  }
}