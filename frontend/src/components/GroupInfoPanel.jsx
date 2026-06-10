import { useState, useEffect } from 'react'
import api from '../api'
import useStore from '../store'

export default function GroupInfoPanel({ chat, onClose }) {
  const [members, setMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const { user, setChats, setActiveChat } = useStore()

  const isAdmin = chat.created_by === user?.id

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      const res = await api.get(`/chats/group/${chat.room_id}/members`)
      setMembers(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSearch = async (e) => {
    const value = e.target.value
    setSearchQuery(value)
    if (!value.trim()) {
      setSearchResults([])
      return
    }
    try {
      const res = await api.get(`/users/search?q=${value}`)
      const filtered = res.data.filter(
        (u) => !members.find((m) => m.id === u.id)
      )
      setSearchResults(filtered)
    } catch (err) {
      console.error(err)
    }
  }

  const addMember = async (userId) => {
    try {
      await api.post(`/chats/group/${chat.room_id}/members`, {
        user_id: userId
      })
      setSearchQuery('')
      setSearchResults([])
      loadMembers()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add member')
    }
  }

  const leaveGroup = async () => {
    if (!window.confirm('Leave this group?')) return
    try {
      await api.delete(`/chats/group/${chat.room_id}/leave`)
      const res = await api.get('/chats/')
      setChats(res.data)
      setActiveChat(null)
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={styles.panel}>

      <div style={styles.panelHeader}>
        <h3 style={styles.panelTitle}>Group Info</h3>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {/* Group name */}
      <div style={styles.groupNameSection}>
        <div style={styles.groupAvatar}>
          {chat.group_name?.[0]?.toUpperCase()}
        </div>
        <p style={styles.groupName}>{chat.group_name}</p>
        <p style={styles.memberCount}>{members.length} members</p>
      </div>

      {/* Add member (admin only) */}
      {isAdmin && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>Add Member</p>
          <input
            style={styles.input}
            placeholder="Search users..."
            value={searchQuery}
            onChange={handleSearch}
          />
          {searchResults.map((u) => (
            <div
              key={u.id}
              style={styles.memberItem}
              onClick={() => addMember(u.id)}
            >
              <div style={styles.miniAvatar}>
                {u.username[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 14 }}>{u.username}</span>
              <span style={styles.addTag}>+ Add</span>
            </div>
          ))}
        </div>
      )}

      {/* Members list */}
      <div style={styles.section}>
        <p style={styles.sectionTitle}>Members</p>
        {members.map((m) => (
          <div key={m.id} style={styles.memberItem}>
            <div style={{ position: 'relative' }}>
              <div style={styles.miniAvatar}>
                {m.username[0].toUpperCase()}
              </div>
              {m.is_online && <div style={styles.onlineDot} />}
            </div>
            <span style={{ fontSize: 14, flex: 1 }}>{m.username}</span>
            {m.id === chat.created_by && (
              <span style={styles.adminBadge}>Admin</span>
            )}
            {m.id === user?.id && (
              <span style={styles.youBadge}>You</span>
            )}
          </div>
        ))}
      </div>

      {/* Leave group */}
      <button onClick={leaveGroup} style={styles.leaveBtn}>
        Leave Group
      </button>

    </div>
  )
}

const styles = {
  panel: {
    width: 280,
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: 'white',
    overflowY: 'auto'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#075e54'
  },
  panelTitle: {
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
  groupNameSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    borderBottom: '1px solid #f0f0f0'
  },
  groupAvatar: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    backgroundColor: '#075e54',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 12
  },
  groupName: {
    margin: 0,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  memberCount: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#888'
  },
  section: {
    padding: '16px',
    borderBottom: '1px solid #f0f0f0'
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 13,
    marginBottom: 8,
    boxSizing: 'border-box',
    outline: 'none'
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    gap: 10,
    cursor: 'pointer'
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#075e54',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    flexShrink: 0,
    position: 'relative'
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#25d366',
    border: '2px solid white',
    position: 'absolute',
    bottom: 0,
    right: 0
  },
  adminBadge: {
    fontSize: 11,
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '2px 8px',
    borderRadius: 10,
    fontWeight: '600'
  },
  youBadge: {
    fontSize: 11,
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: '2px 8px',
    borderRadius: 10
  },
  addTag: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#075e54',
    fontWeight: '600'
  },
  leaveBtn: {
    margin: 16,
    padding: '10px',
    backgroundColor: 'white',
    color: '#e53935',
    border: '1px solid #e53935',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: '600'
  }
}