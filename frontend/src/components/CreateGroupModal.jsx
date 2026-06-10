import { useState } from 'react'
import api from '../api'
import { getSocket } from '../socket'

export default function CreateGroupModal({ onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        (u) => !selectedUsers.find((s) => s.id === u.id)
      )
      setSearchResults(filtered)
    } catch (err) {
      console.error(err)
    }
  }

  const addUser = (user) => {
    setSelectedUsers([...selectedUsers, user])
    setSearchResults([])
    setSearchQuery('')
  }

  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId))
  }

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError('Enter a group name')
      return
    }
    if (selectedUsers.length < 2) {
      setError('Add at least 2 members')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/chats/group', {
        name: groupName.trim(),
        member_ids: selectedUsers.map((u) => u.id)
      })

      const socket = getSocket()
      if (socket) {
        socket.emit('join_new_room', { room_id: res.data.room_id })
      }

      onGroupCreated()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>New Group</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Search users to add..."
          value={searchQuery}
          onChange={handleSearch}
        />

        {searchResults.length > 0 && (
          <div style={styles.searchResults}>
            {searchResults.map((u) => (
              <div
                key={u.id}
                style={styles.searchItem}
                onClick={() => addUser(u)}
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

        {selectedUsers.length > 0 && (
          <div style={styles.selectedWrapper}>
            <p style={styles.selectedLabel}>
              Members ({selectedUsers.length})
            </p>
            <div style={styles.selectedList}>
              {selectedUsers.map((u) => (
                <div key={u.id} style={styles.selectedChip}>
                  <span>{u.username}</span>
                  <button
                    onClick={() => removeUser(u.id)}
                    style={styles.removeBtn}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          style={{
            ...styles.createBtn,
            opacity: loading ? 0.7 : 1
          }}
          onClick={createGroup}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>

      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 420,
    maxHeight: '80vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: '600'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#666'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box',
    outline: 'none'
  },
  searchResults: {
    border: '1px solid #eee',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden'
  },
  searchItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    cursor: 'pointer',
    gap: 10,
    borderBottom: '1px solid #f5f5f5'
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#075e54',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
    flexShrink: 0
  },
  addTag: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#075e54',
    fontWeight: '600'
  },
  selectedWrapper: {
    marginBottom: 16
  },
  selectedLabel: {
    margin: '0 0 8px',
    fontSize: 13,
    color: '#666'
  },
  selectedList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  selectedChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 13
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 11,
    cursor: 'pointer',
    color: '#666',
    padding: 0,
    lineHeight: 1
  },
  createBtn: {
    width: '100%',
    padding: 12,
    backgroundColor: '#075e54',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: 4
  },
  error: {
    color: 'red',
    fontSize: 13,
    marginBottom: 12
  }
}