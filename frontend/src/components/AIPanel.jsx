import { useState, useRef } from 'react'
import api from '../api'

const QUICK_PROMPTS = [
  { label: '🌤 Weather', prompt: 'What should I know about checking weather?' },
  { label: '💡 Idea', prompt: 'Give me a fun conversation starter' },
  { label: '😄 Joke', prompt: 'Tell me a short funny joke' },
  { label: '📝 Help', prompt: 'What can you help me with?' }
]

export default function AIPanel({ onClose }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I am your AI assistant powered by Groq.\n\nI can help you with:\n• Answering questions\n• Writing & grammar\n• Translation\n• Coding help\n• And much more!\n\nWhat can I do for you?'
    }
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  const sendMessage = async (text) => {
    const msgText = text || input.trim()
    if (!msgText || loading) return

    const userMsg = { role: 'user', content: msgText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const history = newMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content
      }))

      const res = await api.post('/ai/chat', {
        message: msgText,
        history
      })

      setMessages([
        ...newMessages,
        { role: 'assistant', content: res.data.reply }
      ])

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)

    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: '❌ Something went wrong. Please try again.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: '🔄 Chat cleared! How can I help you?'
    }])
  }

  return (
    <div style={styles.panel}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.aiAvatar}>🤖</div>
        <div style={styles.headerInfo}>
          <p style={styles.headerName}>AI Assistant</p>
          <p style={styles.headerSub}>Powered by Groq ⚡</p>
        </div>
        <button onClick={clearChat} style={styles.clearBtn} title="Clear chat">
          🗑
        </button>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {/* Quick prompts */}
      <div style={styles.quickPrompts}>
        {QUICK_PROMPTS.map((q, i) => (
          <button
            key={i}
            style={styles.quickBtn}
            onClick={() => sendMessage(q.prompt)}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user'
                ? 'flex-end'
                : 'flex-start',
              marginBottom: 8,
              paddingLeft: 10,
              paddingRight: 10,
              gap: 6,
              alignItems: 'flex-end'
            }}
          >
            {msg.role === 'assistant' && (
              <div style={styles.botAvatarSmall}>🤖</div>
            )}
            <div style={{
              maxWidth: '78%',
              padding: '10px 13px',
              borderRadius: msg.role === 'user'
                ? '16px 16px 0 16px'
                : '16px 16px 16px 0',
              backgroundColor: msg.role === 'user'
                ? '#dcf8c6'
                : 'white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              fontSize: 13,
              lineHeight: 1.6,
              color: '#1a1a1a',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{
            display: 'flex',
            paddingLeft: 10,
            gap: 6,
            alignItems: 'center',
            marginBottom: 8
          }}>
            <div style={styles.botAvatarSmall}>🤖</div>
            <div style={styles.thinkingBubble}>
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>
                thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        <textarea
          style={styles.input}
          placeholder="Ask anything... (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: input.trim() && !loading ? 1 : 0.4
          }}
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          ➤
        </button>
      </div>

    </div>
  )
}

const styles = {
  panel: {
    width: 320,
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f0f2f5'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    backgroundColor: '#075e54',
    gap: 8
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#25d366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0
  },
  headerInfo: { flex: 1 },
  headerName: {
    margin: 0,
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  headerSub: {
    margin: 0,
    color: '#b2dfdb',
    fontSize: 11
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: 16,
    cursor: 'pointer',
    padding: 4,
    opacity: 0.7
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4
  },
  quickPrompts: {
    display: 'flex',
    gap: 6,
    padding: '8px 10px',
    backgroundColor: 'white',
    borderBottom: '1px solid #eee',
    flexWrap: 'wrap'
  },
  quickBtn: {
    backgroundColor: '#f0f2f5',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: '3px 10px',
    fontSize: 11,
    cursor: 'pointer',
    color: '#333',
    fontWeight: '500'
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 0',
    display: 'flex',
    flexDirection: 'column'
  },
  botAvatarSmall: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    backgroundColor: '#25d366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    flexShrink: 0
  },
  thinkingBubble: {
    backgroundColor: 'white',
    borderRadius: '16px 16px 16px 0',
    padding: '10px 14px',
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#888',
    display: 'inline-block',
    animation: 'bounce 1.2s infinite ease-in-out'
  },
  inputArea: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 10px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: 'white',
    gap: 8
  },
  input: {
    flex: 1,
    padding: '9px 13px',
    borderRadius: 18,
    border: '1px solid #ddd',
    fontSize: 13,
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    backgroundColor: '#f0f2f5',
    lineHeight: 1.4
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#075e54',
    color: 'white',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }
}