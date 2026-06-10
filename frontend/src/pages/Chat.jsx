import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import CallScreen from '../components/CallScreen'
import useStore from '../store'
import { connectSocket, disconnectSocket, getSocket } from '../socket'
import api from '../api'
import {
  requestNotificationPermission,
  showNotification,
  showCallNotification
} from '../utils/notifications'

export default function Chat() {
  const { logout, token, setChats, activeChat, setActiveChat } = useStore()
  const navigate = useNavigate()

  const [showChat, setShowChat] = useState(false)
  const [incomingCall, setIncomingCall] = useState(null)
  const [outgoingCall, setOutgoingCall] = useState(null)

  const isMobile = window.innerWidth <= 768

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  useEffect(() => {
    if (!token) return
    const socket = connectSocket(token)

    // messages
    socket.on('receive_message', (msg) => {
      const store = useStore.getState()
      const { activeChat, addMessage, chats, setChats, user } = store

      const isActiveChat = activeChat && activeChat.room_id === msg.room_id
      const isFromMe = Number(msg.sender_id) === Number(user?.id)

      if (isActiveChat) {
        addMessage(msg)
        if (!isFromMe) {
          socket.emit('seen_message', { room_id: msg.room_id })
        }
      } else if (!isFromMe) {
        // show notification
        showNotification(
          msg.sender_username || 'New Message',
          msg.message_type === 'text'
            ? msg.message
            : msg.message_type === 'image'
            ? '📷 Photo'
            : msg.message_type === 'audio'
            ? '🎵 Audio'
            : '📎 File',
          null,
          () => {
            const { chats, setActiveChat } = useStore.getState()
            const chat = chats.find(c => c.room_id === msg.room_id)
            if (chat) setActiveChat(chat)
          }
        )
      }

      // ── Instant in-place update of chat list ──
      // Move the updated chat to top, update last message & unread badge
      const updatedChats = useStore.getState().chats.map((c) => {
        if (c.room_id !== msg.room_id) return c
        return {
          ...c,
          last_message: msg.message_type === 'text' ? msg.message : `📎 ${msg.message_type}`,
          last_message_time: msg.created_at,
          // increment unread only if this chat is NOT currently open AND message is from someone else
          unread_count: (isActiveChat || isFromMe) ? 0 : (c.unread_count || 0) + 1
        }
      })
      // sort: chats with most recent message first
      updatedChats.sort((a, b) =>
        (b.last_message_time || '').localeCompare(a.last_message_time || '')
      )
      setChats(updatedChats)

      // background full-refresh to sync with DB (seen status, etc.)
      api.get('/chats/').then((res) => {
        const freshChats = res.data.map((c) => {
          // keep unread_count as 0 for the currently open chat
          const currentActive = useStore.getState().activeChat
          if (currentActive && c.room_id === currentActive.room_id) {
            return { ...c, unread_count: 0 }
          }
          return c
        })
        setChats(freshChats)
      })
    })

    // online/offline
    socket.on('user_online', ({ user_id }) => {
      const { chats, setChats } = useStore.getState()
      const updated = chats.map((chat) => {
        if (chat.other_user?.id === user_id) {
          return { ...chat, other_user: { ...chat.other_user, is_online: true } }
        }
        return chat
      })
      setChats(updated)
    })

    socket.on('user_offline', ({ user_id }) => {
      const { chats, setChats } = useStore.getState()
      const updated = chats.map((chat) => {
        if (chat.other_user?.id === user_id) {
          return { ...chat, other_user: { ...chat.other_user, is_online: false } }
        }
        return chat
      })
      setChats(updated)
    })

    // send error
    socket.on('send_error', ({ message }) => {
      alert(message)
    })

    // ── CALL EVENTS — always listen here ──
    socket.on('incoming_call', (data) => {
      console.log('incoming call received:', data)
      setIncomingCall(data)

      // show browser notification for call
      showCallNotification(
        data.caller_name,
        data.call_type
      )
    })

    socket.on('call_failed', ({ reason }) => {
      alert(reason || 'Call failed')
      setOutgoingCall(null)
    })

    // message deleted
    socket.on('message_deleted', ({ message_id, room_id, delete_type }) => {
      const store = useStore.getState()
      if (
        store.activeChat &&
        store.activeChat.room_id === room_id
      ) {
        if (delete_type === 'everyone') {
          store.deleteMessageForEveryone(message_id)
        } else {
          store.deleteMessageForMe(message_id)
        }
      }
      // refresh chat list for last message update
      api.get('/chats/').then((res) => setChats(res.data))
    })

    // view once seen — notify sender
    socket.on('view_once_seen', ({ message_id, room_id }) => {
      const store = useStore.getState()
      if (
        store.activeChat &&
        store.activeChat.room_id === room_id
      ) {
        store.markViewOnceOpened(message_id)
      }
    })

    return () => {
      socket.off('receive_message')
      socket.off('user_online')
      socket.off('user_offline')
      socket.off('send_error')
      socket.off('incoming_call')
      socket.off('call_failed')
      socket.off('message_deleted')
      socket.off('view_once_seen')
    }
  }, [token])

  // mobile: show chat when active chat selected
  useEffect(() => {
    if (activeChat && isMobile) {
      setShowChat(true)
    }
  }, [activeChat])

  const handleBack = () => {
    setShowChat(false)
    setActiveChat(null)
  }

  return (
    <div style={styles.container}>

      {/* Sidebar */}
      <div style={{
        width: isMobile ? '100%' : '30%',
        flexShrink: 0,
        display: isMobile && showChat ? 'none' : 'flex',
        flexDirection: 'column'
      }}>
        <Sidebar isMobile={isMobile} />
      </div>

      {/* Chat Window */}
      <div style={{
        flex: 1,
        display: isMobile && !showChat ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <ChatWindow
          isMobile={isMobile}
          onBack={isMobile ? handleBack : null}
          onStartCall={(type, user) => {
            setOutgoingCall({ type, user })
          }}
        />
      </div>

      {/* ── Incoming Call — always visible ── */}
      {incomingCall && (
        <CallScreen
          callType={incomingCall.call_type}
          remoteUser={{
            id: incomingCall.caller_id,
            username: incomingCall.caller_name,
            avatar_url: incomingCall.caller_avatar
          }}
          isIncoming={true}
          callOffer={incomingCall.offer}
          callerId={incomingCall.caller_id}
          onClose={() => setIncomingCall(null)}
        />
      )}

      {/* ── Outgoing Call ── */}
      {outgoingCall && (
        <CallScreen
          callType={outgoingCall.type}
          remoteUser={outgoingCall.user}
          isIncoming={false}
          onClose={() => setOutgoingCall(null)}
        />
      )}

    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#f0f2f5'
  }
}