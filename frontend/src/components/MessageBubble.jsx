import { useState, useRef } from 'react'
import useStore from '../store'
import { formatMessageTime } from '../utils/timeFormat'
import FileMessage from './FileMessage'
import { getAvatarUrl, getInitial } from '../utils/avatarHelper'
import MessageContextMenu from './MessageContextMenu'
import { getSocket } from '../socket'
import api from '../api'

export default function MessageBubble({ message, isGroup }) {
  const { user, deleteMessageForMe, deleteMessageForEveryone } = useStore()
  const isMe = Number(message.sender_id) === Number(user?.id)
  const isFile = message.message_type !== 'text' &&
                 message.message_type !== 'deleted'
  const isDeleted = message.message_type === 'deleted'

  const [viewOnceOpened, setViewOnceOpened] = useState(
    message.view_once_opened
  )
  const [contextMenu, setContextMenu] = useState(null)
  const [showViewOnceViewer, setShowViewOnceViewer] = useState(false)

  // long press for mobile
  const longPressTimer = useRef(null)

  const handleViewOnceOpen = () => {
    // prevent double tap
    if (viewOnceOpened) return
    setShowViewOnceViewer(true)
  }

  const handleCloseViewOnceViewer = async () => {
    setShowViewOnceViewer(false)

    try {
      await api.post(
        `/chats/${message.room_id}/messages/${message.id}/view-once`
      )

      // update local state immediately
      setViewOnceOpened(true)

      // also update global store
      const { markViewOnceOpened } = useStore.getState()
      markViewOnceOpened(message.id)

      // notify sender via socket
      const socket = getSocket()
      if (socket) {
        socket.emit('view_once_opened', {
          message_id: message.id,
          room_id: message.room_id,
          sender_id: message.sender_id
        })
      }

    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail === "Already opened") {
        // already opened
        setViewOnceOpened(true)
      }
      console.error('View once error:', err)
    }
  }

  // right click
  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isDeleted) return
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleTouchStart = (e) => {
    if (isDeleted) return
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0]
      setContextMenu({ x: touch.clientX, y: touch.clientY })
    }, 500)
  }
  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  const handleDeleteForMe = () => {
    deleteMessageForMe(message.id)
    const socket = getSocket()
    if (socket) {
      socket.emit('delete_message', {
        message_id: message.id,
        room_id: message.room_id,
        delete_for_everyone: false
      })
    }
  }

  const handleDeleteForEveryone = () => {
    deleteMessageForEveryone(message.id)
    const socket = getSocket()
    if (socket) {
      socket.emit('delete_message', {
        message_id: message.id,
        room_id: message.room_id,
        delete_for_everyone: true
      })
    }
  }

  const renderTicks = () => {
    if (!isMe || isDeleted) return null
    if (message.is_seen) {
      return <span style={{ color: '#4fc3f7', fontSize: 13 }}>✓✓</span>
    }
    return <span style={{ color: '#999', fontSize: 13 }}>✓</span>
  }

  const renderAvatar = () => {
    if (isMe) return null
    const avatarUrl = getAvatarUrl(message.sender_avatar)
    return (
      <div style={styles.senderAvatar}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={message.sender_username}
            style={styles.avatarImg}
          />
        ) : (
          <div style={styles.avatarPlaceholder}>
            {getInitial(message.sender_username)}
          </div>
        )}
      </div>
    )
  }

  const msgWithViewOnce = {
    ...message,
    view_once_opened: viewOnceOpened
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          marginBottom: 4,
          paddingLeft: 12,
          paddingRight: 16,
          gap: 6
        }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!isMe && renderAvatar()}

        <div style={{
          maxWidth: isFile ? '70%' : '65%',
          padding: isDeleted ? '8px 12px' : isFile ? '6px 8px' : '8px 12px',
          backgroundColor: isDeleted
            ? '#f5f5f5'
            : isMe ? '#dcf8c6' : 'white',
          borderRadius: isMe
            ? '12px 12px 0px 12px'
            : '12px 12px 12px 0px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          minWidth: 80
        }}>

          {/* Group sender name */}
          {isGroup && !isMe && !isDeleted && (
            <p style={{
              margin: '0 0 4px',
              fontSize: 12,
              fontWeight: '600',
              color: '#075e54'
            }}>
              {message.sender_username}
            </p>
          )}

          {/* View once badge for sender */}
          {message.view_once && isMe && !isDeleted && (
            <div style={styles.viewOnceSentBadge}>
              {viewOnceOpened ? (
                <span style={{ color: '#888' }}>👁 Viewed</span>
              ) : (
                <span style={{ color: '#e65100' }}>👁 View once</span>
              )}
            </div>
          )}

          {/* Deleted message */}
          {isDeleted ? (
            <p style={styles.deletedText}>
              🚫 {isMe ? 'You deleted this message' : 'This message was deleted'}
            </p>
          ) : isFile ? (
            <FileMessage
              message={msgWithViewOnce}
              onViewOnceOpen={handleViewOnceOpen}
              isMe={isMe}
            />
          ) : (
            <p style={{
              margin: 0,
              fontSize: 14,
              color: '#1a1a1a',
              lineHeight: 1.5,
              wordBreak: 'break-word'
            }}>
              {message.message}
            </p>
          )}

          {/* Time + ticks */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 4,
            marginTop: 4
          }}>
            <span style={{ fontSize: 11, color: '#888' }}>
              {formatMessageTime(message.created_at)}
            </span>
            {renderTicks()}
          </div>

        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isMe={isMe}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* View Once Fullscreen Viewer */}
      {showViewOnceViewer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Close Button */}
          <button
            onClick={handleCloseViewOnceViewer}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: 24,
              width: 44,
              height: 44,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100000
            }}
          >
            ✕
          </button>

          {/* The Image */}
          <img
            src={message.file_url?.startsWith('http') ? message.file_url : `http://localhost:8000${message.file_url}`}
            alt="View Once"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </>
  )
}

const styles = {
  senderAvatar: {
    flexShrink: 0,
    marginBottom: 2
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block'
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#075e54',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  viewOnceSentBadge: {
    fontSize: 11,
    color: '#e65100',
    marginBottom: 4,
    fontWeight: '600'
  },
  deletedText: {
    margin: 0,
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic'
  }
}