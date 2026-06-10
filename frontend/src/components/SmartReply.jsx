import { useState } from 'react'
import api from '../api'

export default function SmartReply({ messages, onSelect }) {
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(false)

  const fetchReplies = async () => {
    // toggle off if already shown
    if (shown) {
      setShown(false)
      setReplies([])
      return
    }

    setLoading(true)
    try {
      // last 10 text messages only
      const last10 = messages
        .filter((m) => m.message && m.message_type === 'text')
        .slice(-10)
        .map((m) => ({
          sender: m.sender_username || 'User',
          text: m.message
        }))

      if (last10.length === 0) {
        setLoading(false)
        return
      }

      const res = await api.post('/ai/smart-reply', {
        messages: last10
      })

      setReplies(res.data.replies)
      setShown(true)

    } catch (err) {
      console.error('Smart reply failed', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (reply) => {
    onSelect(reply)
    setShown(false)
    setReplies([])
  }

  return (
    <div style={styles.wrapper}>

      {/* Trigger Button */}
      <button
        style={{
          ...styles.triggerBtn,
          backgroundColor: shown ? '#d9fdd3' : 'white',
          borderColor: shown ? '#25d366' : '#ddd'
        }}
        onClick={fetchReplies}
        disabled={loading}
      >
        {loading ? (
          <span style={styles.loadingDots}>
            <span style={styles.dot} />
            <span style={styles.dot} />
            <span style={styles.dot} />
          </span>
        ) : (
          <>✨ {shown ? 'Hide' : 'Smart Reply'}</>
        )}
      </button>

      {/* Reply Chips */}
      {shown && replies.length > 0 && (
        <div style={styles.chipsRow}>
          {replies.map((reply, i) => (
            <button
              key={i}
              style={styles.chip}
              onClick={() => handleSelect(reply)}
              title={reply}
            >
              {reply.length > 40 ? reply.slice(0, 40) + '...' : reply}
            </button>
          ))}
        </div>
      )}

    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  triggerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 12px',
    border: '1px solid #ddd',
    borderRadius: 16,
    backgroundColor: 'white',
    fontSize: 12,
    fontWeight: '600',
    color: '#075e54',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    height: 28,
    transition: 'all 0.15s'
  },
  loadingDots: {
    display: 'flex',
    gap: 3,
    alignItems: 'center'
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: '#075e54',
    display: 'inline-block',
    animation: 'bounce 1.2s infinite ease-in-out'
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 2
  },
  chip: {
    backgroundColor: 'white',
    border: '1px solid #c8e6c9',
    borderRadius: 16,
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
    color: '#1a1a1a',
    textAlign: 'left',
    transition: 'background 0.15s',
    maxWidth: 240
  }
}