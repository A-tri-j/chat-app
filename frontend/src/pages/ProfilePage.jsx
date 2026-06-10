import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import useStore from '../store'
import { getAvatarUrl } from '../utils/avatarHelper'

export default function ProfilePage() {
  const { user, setUser } = useStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    username: user?.username || '',
    bio: user?.bio || ''
  })
  const [loading, setLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleUpdate = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.put('/users/me', form)
      setUser(res.data)
      setSuccess('Profile updated successfully')
    } catch (err) {
      setError(err.response?.data?.detail || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  setAvatarLoading(true)
  setError('')
  setSuccess('')

  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    // fetch fresh full profile after avatar update
    const profileRes = await api.get('/users/me')
    setUser(profileRes.data)
    setSuccess('Avatar updated successfully')

  } catch (err) {
    console.error('Avatar upload error:', err)
    setError(err.response?.data?.detail || 'Avatar upload failed')
  } finally {
    setAvatarLoading(false)
    e.target.value = ''
  }
}

  const avatarUrl = getAvatarUrl(user?.avatar_url)

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <button
            onClick={() => navigate('/chat')}
            style={styles.backBtn}
          >
            ← Back
          </button>
          <h2 style={styles.title}>My Profile</h2>
        </div>

        {/* Avatar Section */}
        <div style={styles.avatarSection}>
          <div
            style={styles.avatarWrapper}
            onClick={() => fileInputRef.current.click()}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                style={styles.avatarImage}
              />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div style={styles.avatarOverlay}>
              {avatarLoading ? '⏳' : '📷'}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />

          <p style={styles.avatarHint}>
            Click avatar to change photo
          </p>
        </div>

        {/* Messages */}
        {success && <p style={styles.success}>{success}</p>}
        {error && <p style={styles.error}>{error}</p>}

        {/* Form */}
        <div style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Your username"
          />

          <label style={styles.label}>Bio</label>
          <textarea
            style={styles.textarea}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Write something about yourself..."
            rows={3}
          />

          <label style={styles.label}>Email</label>
          <input
            style={{ ...styles.input, backgroundColor: '#f5f5f5', color: '#888' }}
            value={user?.email || ''}
            disabled
          />

          <button
            style={{
              ...styles.saveBtn,
              opacity: loading ? 0.7 : 1
            }}
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    boxShadow: '0 2px 16px rgba(0,0,0,0.1)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#075e54',
    gap: 16
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: 16,
    cursor: 'pointer'
  },
  title: {
    margin: 0,
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 20px 16px'
  },
  avatarWrapper: {
    position: 'relative',
    cursor: 'pointer',
    borderRadius: '50%',
    overflow: 'hidden',
    width: 100,
    height: 100
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block'
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    backgroundColor: '#075e54',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold'
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    textAlign: 'center',
    padding: '6px 0',
    fontSize: 16
  },
  avatarHint: {
    margin: '10px 0 0',
    fontSize: 12,
    color: '#999'
  },
  form: {
    padding: '0 24px 24px'
  },
  label: {
    display: 'block',
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none'
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  saveBtn: {
    width: '100%',
    padding: 12,
    backgroundColor: '#075e54',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: 24
  },
  success: {
    margin: '0 24px 8px',
    padding: '10px 14px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: 8,
    fontSize: 13
  },
  error: {
    margin: '0 24px 8px',
    padding: '10px 14px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: 8,
    fontSize: 13
  }
}