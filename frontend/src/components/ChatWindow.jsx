import { useEffect, useRef, useState } from 'react'
import useStore from '../store'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import GroupInfoPanel from './GroupInfoPanel'
import CallScreen from './CallScreen'
import UserProfileModal from './UserProfileModal'
import { getSocket } from '../socket'
import { getAvatarUrl, getInitial } from '../utils/avatarHelper'

export default function ChatWindow({ onBack, onStartCall }) {
  const { activeChat, messages, setMessages } = useStore()
  const bottomRef = useRef(null)
  const messagesAreaRef = useRef(null)
  const typingTimeout = useRef(null)

  const [typingUser, setTypingUser] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [viewingUserId, setViewingUserId] = useState(null)

  const isMobile = window.innerWidth <= 768

  // scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // scroll button visibility
  const handleScroll = () => {
    const el = messagesAreaRef.current
    if (!el) return
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollBtn(!isNearBottom)
  }

  // when active chat changes — mark seen + reset group info
  useEffect(() => {
    if (!activeChat) return
    setShowGroupInfo(false)

    const socket = getSocket()
    if (!socket) return

    const state = useStore.getState()
    const hasUnread = state.messages.some(
      (m) =>
        Number(m.sender_id) !== Number(state.user?.id) && !m.is_seen
    )
    if (hasUnread) {
      socket.emit('seen_message', { room_id: activeChat.room_id })
    }
  }, [activeChat])

  // messages seen event
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleSeen = (data) => {
      const state = useStore.getState()
      if (
        !state.activeChat ||
        data.room_id !== state.activeChat.room_id
      ) return
      const updated = state.messages.map((m) => ({
        ...m,
        is_seen: true
      }))
      state.setMessages(updated)
    }

    socket.on('messages_seen', handleSeen)
    return () => socket.off('messages_seen', handleSeen)
  }, [])

  // typing indicator event
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleTyping = (data) => {
      const { activeChat } = useStore.getState()
      if (!activeChat || data.room_id !== activeChat.room_id) return

      if (data.is_typing) {
        setTypingUser(data.username)
        clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(
          () => setTypingUser(null),
          3000
        )
      } else {
        setTypingUser(null)
        clearTimeout(typingTimeout.current)
      }
    }

    socket.on('typing_status', handleTyping)
    return () => socket.off('typing_status', handleTyping)
  }, [])

  // empty state — only shown on desktop (on mobile Chat.jsx never renders ChatWindow without an activeChat)
  if (!activeChat) {
    return (
      <div style={{ ...styles.empty, flex: 1 }}>
        <div style={styles.emptyContent}>
          <div style={styles.emptyIcon}>💬</div>
          <h3 style={styles.emptyTitle}>Welcome to Chat</h3>
          <p style={styles.emptyText}>
            Select a conversation or search a user to start chatting
          </p>
        </div>
      </div>
    )
  }

  const chatName = activeChat.is_group
    ? activeChat.group_name
    : activeChat.other_user?.username

  const chatStatus = activeChat.is_group
    ? 'Group chat'
    : typingUser
      ? `${typingUser} is typing...`
      : activeChat.other_user?.is_online
        ? 'Online'
        : 'Offline'

  // avatar in header — show real photo if available
  const headerAvatarUrl = activeChat.is_group
    ? null
    : getAvatarUrl(activeChat.other_user?.avatar_url)

  return (
    <div style={{ display: 'flex', flex: 1, height: '100vh', width: '100%' }}>
      <div style={styles.container}>

        {/* ── Header ── */}
        <div style={styles.header}>

          {/* Back button — mobile only */}
          {isMobile && (
            <button
              onClick={onBack}
              style={styles.backBtn}
              title="Back to chats"
            >
              ‹
            </button>
          )}

          {/* Avatar — clickable to view profile (direct chat only) */}
          <div
            style={{ position: 'relative', flexShrink: 0 }}
            onClick={() => {
              if (!activeChat.is_group && activeChat.other_user) {
                setViewingUserId(activeChat.other_user.id)
              } else if (activeChat.is_group) {
                setShowGroupInfo(!showGroupInfo)
              }
            }}
          >
            {headerAvatarUrl ? (
              <img
                src={headerAvatarUrl}
                alt={chatName}
                style={styles.headerAvatarImg}
              />
            ) : (
              <div style={styles.avatar}>
                {chatName?.[0]?.toUpperCase()}
              </div>
            )}

            {!activeChat.is_group &&
              activeChat.other_user?.is_online && (
                <div style={styles.onlineDot} />
              )}
          </div>

          {/* Name + status — clickable for group info */}
          <div
            style={styles.headerInfo}
            onClick={() => {
              if (activeChat.is_group) {
                setShowGroupInfo(!showGroupInfo)
              }
            }}
          >
            <p
              style={{
                ...styles.headerName,
                cursor: !activeChat.is_group ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (!activeChat.is_group && activeChat.other_user) {
                  setViewingUserId(activeChat.other_user.id)
                }
              }}
            >
              {chatName}
            </p>
            <p style={styles.headerStatus}>{chatStatus}</p>
          </div>

          {/* Call buttons — direct chats only */}
          {!activeChat.is_group && (
            <div style={styles.callButtons}>
              {!isMobile && (
                <button
                  style={styles.callBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartCall && onStartCall('voice', activeChat.other_user)
                  }}
                  title="Voice call"
                >
                  📞
                </button>
              )}
              <button
                style={styles.callBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  onStartCall && onStartCall('video', activeChat.other_user)
                }}
                title="Video call"
              >
                📹
              </button>
            </div>
          )}

          {/* Group info icon */}
          {activeChat.is_group && (
            <span
              style={styles.infoIcon}
              onClick={() => setShowGroupInfo(!showGroupInfo)}
            >
              ℹ️
            </span>
          )}
        </div>

        {/* ── Messages Area ── */}
        <div
          ref={messagesAreaRef}
          style={styles.messagesArea}
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div style={styles.noMessages}>
              <p>No messages yet. Say hello! 👋</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isGroup={activeChat.is_group}
              />
            ))
          )}

          {/* Typing indicator */}
          {typingUser && (
            <div style={styles.typingWrapper}>
              <div style={styles.typingBubble}>
                <span style={styles.dot} />
                <span style={styles.dot} />
                <span style={styles.dot} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() =>
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }
            style={styles.scrollBtn}
          >
            ↓
          </button>
        )}

        <MessageInput />
      </div>

      {/* ── Group Info Panel ── */}
      {showGroupInfo && activeChat.is_group && (
        <GroupInfoPanel
          chat={activeChat}
          onClose={() => setShowGroupInfo(false)}
        />
      )}

      {/* ── Other User Profile Modal ── */}
      {viewingUserId && (
        <UserProfileModal
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
        />
      )}
    </div>
  )
}

const styles = {
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: 30,
    cursor: 'pointer',
    padding: '0 6px 0 0',
    lineHeight: 1,
    flexShrink: 0,
    fontWeight: '300'
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: '#075e54',
    gap: 10
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    backgroundColor: '#25d366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    cursor: 'pointer'
  },
  headerAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
    cursor: 'pointer',
    border: '2px solid #25d366'
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#25d366',
    border: '2px solid #075e54',
    position: 'absolute',
    bottom: 0,
    right: 0
  },
  headerInfo: {
    flex: 1,
    cursor: 'pointer'
  },
  headerName: {
    margin: 0,
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  headerStatus: {
    margin: 0,
    color: '#b2dfdb',
    fontSize: 12,
    marginTop: 2
  },
  callButtons: {
    display: 'flex',
    gap: 8,
    flexShrink: 0
  },
  callBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '50%',
    width: 36,
    height: 36,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoIcon: {
    fontSize: 20,
    cursor: 'pointer',
    flexShrink: 0
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#e5ddd5',
    backgroundImage:
      'radial-gradient(circle, #d4c9b8 1px, transparent 1px)',
    backgroundSize: '20px 20px'
  },
  noMessages: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 14
  },
  typingWrapper: {
    display: 'flex',
    justifyContent: 'flex-start',
    paddingLeft: 16,
    marginTop: 4
  },
  typingBubble: {
    backgroundColor: 'white',
    borderRadius: '12px 12px 12px 0px',
    padding: '10px 14px',
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#888',
    display: 'inline-block',
    animation: 'bounce 1.2s infinite ease-in-out'
  },
  scrollBtn: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: 'white',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    fontSize: 18,
    cursor: 'pointer'
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5'
  },
  emptyContent: { textAlign: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    margin: 0,
    marginBottom: 8,
    color: '#1a1a1a',
    fontSize: 22
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    maxWidth: 280
  }
}