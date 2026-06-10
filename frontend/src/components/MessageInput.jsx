import { useState, useRef, useEffect } from 'react'
import useStore from '../store'
import { getSocket } from '../socket'
import api from '../api'
import SmartReply from './SmartReply'

// Detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function MessageInput() {
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [grammarLoading, setGrammarLoading] = useState(false)
  const [toneMenu, setToneMenu] = useState(false)
  const [viewOnce, setViewOnce] = useState(false)
  const [showMoreTools, setShowMoreTools] = useState(false)

  const { activeChat, messages } = useStore()
  const typingTimeout = useRef(null)
  const isTyping = useRef(false)
  const fileInputRef = useRef(null)
  const isMobile = useIsMobile()

  // ── Send Text Message ──
  const sendTextMessage = () => {
    if (!text.trim() || !activeChat) return
    const socket = getSocket()
    if (!socket) return

    socket.emit('send_message', {
      room_id: activeChat.room_id,
      message: text.trim(),
      message_type: 'text',
      view_once: viewOnce
    })

    setText('')
    setViewOnce(false)
    setToneMenu(false)
    setShowMoreTools(false)

    if (isTyping.current) {
      socket.emit('stop_typing', { room_id: activeChat.room_id })
      isTyping.current = false
    }
  }

  // ── File Upload ──
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const { file_url, file_name, is_image, file_type } = res.data

      let message_type = 'file'
      if (is_image) message_type = 'image'
      else if (file_type.startsWith('audio/')) message_type = 'audio'
      else if (file_type.startsWith('video/')) message_type = 'video'

      const socket = getSocket()
      if (!socket) return

      socket.emit('send_message', {
        room_id: activeChat.room_id,
        message: null,
        message_type,
        file_url,
        file_name,
        view_once: viewOnce
      })

      // reset view once after sending
      setViewOnce(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ── Typing Events ──
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendTextMessage()
    }
    if (e.key === 'Escape') {
      setToneMenu(false)
      setShowMoreTools(false)
    }
  }

  const handleChange = (e) => {
    setText(e.target.value)
    setToneMenu(false)

    const socket = getSocket()
    if (!socket || !activeChat) return

    if (!isTyping.current) {
      socket.emit('typing', { room_id: activeChat.room_id })
      isTyping.current = true
    }

    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop_typing', { room_id: activeChat.room_id })
      isTyping.current = false
    }, 1500)
  }

  // ── AI Grammar Fix ──
  const fixGrammar = async () => {
    if (!text.trim() || grammarLoading) return
    setGrammarLoading(true)
    try {
      const res = await api.post('/ai/fix-grammar', { text: text.trim() })
      setText(res.data.fixed)
    } catch (err) {
      console.error('Grammar fix failed', err)
    } finally {
      setGrammarLoading(false)
    }
  }

  // ── AI Tone Change ──
  const changeTone = async (tone) => {
    if (!text.trim()) return
    setToneMenu(false)
    try {
      const res = await api.post('/ai/change-tone', {
        text: text.trim(),
        tone
      })
      setText(res.data.result)
    } catch (err) {
      console.error('Tone change failed', err)
    }
  }

  if (!activeChat) return null

  const tones = [
    { label: '👔 Formal', value: 'formal' },
    { label: '😊 Casual', value: 'casual' },
    { label: '🤝 Friendly', value: 'friendly' },
    { label: '💼 Professional', value: 'professional' },
    { label: '😄 Funny', value: 'funny' },
    { label: '❤️ Romantic', value: 'romantic' },
  ]

  return (
    <div style={styles.wrapper}>

      {/* ── Tone Menu Popup ── */}
      {toneMenu && (
        <div style={styles.toneMenu}>
          <p style={styles.toneTitle}>Change Tone</p>
          {tones.map((t) => (
            <button
              key={t.value}
              style={styles.toneItem}
              onClick={() => changeTone(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Extra Tools Row (mobile only, shown when + tapped) ── */}
      {isMobile && showMoreTools && (
        <div style={styles.mobileToolsRow}>
          {/* Grammar fix */}
          <button
            style={{
              ...styles.toolChip,
              opacity: text.trim() ? 1 : 0.45,
              backgroundColor: grammarLoading ? '#e8f5e9' : '#f0f2f5'
            }}
            onClick={fixGrammar}
            disabled={!text.trim() || grammarLoading}
          >
            {grammarLoading ? '⏳' : '✍️'} Fix Grammar
          </button>

          {/* Tone change */}
          <button
            style={{
              ...styles.toolChip,
              opacity: text.trim() ? 1 : 0.45,
              backgroundColor: toneMenu ? '#e8f5e9' : '#f0f2f5'
            }}
            onClick={() => setToneMenu(!toneMenu)}
            disabled={!text.trim()}
          >
            🎭 Tone
          </button>

          {/* View once */}
          <button
            style={{
              ...styles.toolChip,
              backgroundColor: viewOnce ? '#fff3e0' : '#f0f2f5',
              border: viewOnce ? '1.5px solid #ff9800' : '1.5px solid transparent',
              color: viewOnce ? '#e65100' : '#555'
            }}
            onClick={() => setViewOnce(!viewOnce)}
          >
            👁 {viewOnce ? 'View Once: ON' : 'View Once'}
          </button>
        </div>
      )}

      {/* ── Smart Reply Row ── */}
      {messages.length > 0 && (
        <div style={styles.smartReplyRow}>
          <SmartReply
            messages={messages}
            onSelect={(reply) => setText(reply)}
          />
        </div>
      )}

      {/* ── Main Input Row ── */}
      <div style={styles.inputRow}>

        {/* Desktop: AI tools inline */}
        {!isMobile && (
          <>
            {/* Attach file */}
            <button
              style={styles.iconBtn}
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              title="Attach file"
            >
              {uploading ? '⏳' : '📎'}
            </button>

            {/* Grammar fix */}
            <button
              style={{
                ...styles.iconBtn,
                opacity: text.trim() ? 1 : 0.4,
                backgroundColor: grammarLoading ? '#e8f5e9' : 'white'
              }}
              onClick={fixGrammar}
              disabled={!text.trim() || grammarLoading}
              title="Fix grammar with AI"
            >
              {grammarLoading ? '⏳' : '✍️'}
            </button>

            {/* Tone change */}
            <button
              style={{
                ...styles.iconBtn,
                opacity: text.trim() ? 1 : 0.4,
                backgroundColor: toneMenu ? '#e8f5e9' : 'white'
              }}
              onClick={() => setToneMenu(!toneMenu)}
              disabled={!text.trim()}
              title="Change tone with AI"
            >
              🎭
            </button>
          </>
        )}

        {/* Mobile: + button to expand tools */}
        {isMobile && (
          <button
            style={{
              ...styles.iconBtn,
              backgroundColor: showMoreTools ? '#e8f5e9' : 'white',
              fontSize: 20,
              fontWeight: '400'
            }}
            onClick={() => {
              setShowMoreTools(!showMoreTools)
              setToneMenu(false)
            }}
            title="More options"
          >
            {showMoreTools ? '✕' : '+'}
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          accept="image/*,application/pdf,.doc,.docx,.zip,.txt,audio/*,video/mp4"
          onChange={handleFileChange}
        />

        {/* Mobile: Attach inline */}
        {isMobile && (
          <button
            style={styles.iconBtn}
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            title="Attach file"
          >
            {uploading ? '⏳' : '📎'}
          </button>
        )}

        {/* Text input */}
        <input
          style={styles.input}
          placeholder={uploading ? 'Uploading...' : 'Type a message...'}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={uploading}
          autoComplete="off"
        />

        {/* Desktop: View once */}
        {!isMobile && (
          <button
            style={{
              ...styles.iconBtn,
              backgroundColor: viewOnce ? '#fff3e0' : 'white',
              border: viewOnce ? '1px solid #ff9800' : 'none'
            }}
            onClick={() => setViewOnce(!viewOnce)}
            title={viewOnce ? 'View once ON' : 'View once OFF'}
          >
            👁
          </button>
        )}

        {/* Send button */}
        <button
          style={{
            ...styles.sendButton,
            opacity: text.trim() && !uploading ? 1 : 0.5,
            // on mobile: round icon button
            ...(isMobile ? styles.sendButtonMobile : {})
          }}
          onClick={sendTextMessage}
          disabled={!text.trim() || uploading}
          title="Send message"
        >
          {isMobile ? '➤' : 'Send'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    position: 'relative',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#f0f2f5',
    // safe area for phones with home indicator
    paddingBottom: 'env(safe-area-inset-bottom, 0px)'
  },

  /* Mobile extra tools strip */
  mobileToolsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: '8px 12px 4px',
    borderBottom: '1px solid #e8e8e8',
    backgroundColor: '#f7f8fa'
  },
  toolChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 20,
    border: '1.5px solid transparent',
    fontSize: 12,
    fontWeight: '500',
    cursor: 'pointer',
    color: '#333',
    transition: 'background 0.15s'
  },

  /* Smart replies */
  smartReplyRow: {
    padding: '6px 12px 0'
  },

  /* Tone popup */
  toneMenu: {
    position: 'absolute',
    bottom: 70,
    left: 56,
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    padding: '8px 0',
    zIndex: 50,
    minWidth: 160
  },
  toneTitle: {
    margin: '0 0 4px',
    padding: '4px 14px',
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  toneItem: {
    display: 'block',
    width: '100%',
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    fontSize: 13,
    cursor: 'pointer',
    color: '#1a1a1a'
  },

  /* Main input row */
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 10px',
    gap: 6
  },

  iconBtn: {
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'white',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flexShrink: 0,
    transition: 'background 0.15s'
  },

  input: {
    flex: 1,
    minWidth: 0,           // critical — prevents flex overflow on mobile
    padding: '11px 14px',
    borderRadius: 24,
    border: 'none',
    fontSize: 14,
    backgroundColor: 'white',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },

  /* Desktop send */
  sendButton: {
    padding: '10px 18px',
    backgroundColor: '#075e54',
    color: 'white',
    border: 'none',
    borderRadius: 24,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: '600',
    flexShrink: 0,
    transition: 'opacity 0.15s'
  },

  /* Mobile send — round icon */
  sendButtonMobile: {
    padding: 0,
    width: 42,
    height: 42,
    borderRadius: '50%',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}