import { useEffect, useRef, useState } from 'react'
import { getSocket } from '../socket'
import { getAvatarUrl, getInitial } from '../utils/avatarHelper'

export default function CallScreen({
  callType,
  remoteUser,
  isIncoming,
  callOffer,
  callerId,
  onClose
}) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerRef = useRef(null)
  const localStreamRef = useRef(null)

  const [callState, setCallState] = useState(
    isIncoming ? 'incoming' : 'calling'
  )
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const timerRef = useRef(null)

  const isVideo = callType === 'video'
  const socket = getSocket()

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  useEffect(() => {
    if (!isIncoming) {
      startCall()
    }

    socket.on('call_answered', handleCallAnswered)
    socket.on('ice_candidate', handleRemoteIce)
    socket.on('call_rejected', handleCallRejected)
    socket.on('call_ended', handleRemoteEnd)

    return () => {
      socket.off('call_answered', handleCallAnswered)
      socket.off('ice_candidate', handleRemoteIce)
      socket.off('call_rejected', handleCallRejected)
      socket.off('call_ended', handleRemoteEnd)
      cleanup()
    }
  }, [])

  // timer when connected
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1)
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [callState])

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo
    })
    localStreamRef.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }
    return stream
  }

  const createPeer = (stream) => {
    const peer = new RTCPeerConnection(ICE_SERVERS)

    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream)
    })

    peer.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0]
      }
    }

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice_candidate', {
          target_user_id: remoteUser.id,
          candidate: e.candidate
        })
      }
    }

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setCallState('connected')
      }
      if (
        peer.connectionState === 'disconnected' ||
        peer.connectionState === 'failed'
      ) {
        endCall()
      }
    }

    peerRef.current = peer
    return peer
  }

  const startCall = async () => {
    try {
      const stream = await getMedia()
      const peer = createPeer(stream)
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      socket.emit('call_offer', {
        target_user_id: remoteUser.id,
        call_type: callType,
        offer: peer.localDescription,
        room_id: remoteUser.room_id
      })
    } catch (err) {
      console.error('Start call error:', err)
      onClose()
    }
  }

  const acceptCall = async () => {
    try {
      setCallState('connecting')
      const stream = await getMedia()
      const peer = createPeer(stream)

      await peer.setRemoteDescription(
        new RTCSessionDescription(callOffer)
      )
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)

      socket.emit('call_answer', {
        caller_id: callerId,
        answer: peer.localDescription
      })
    } catch (err) {
      console.error('Accept call error:', err)
      rejectCall()
    }
  }

  const handleCallAnswered = async ({ answer }) => {
    try {
      await peerRef.current?.setRemoteDescription(
        new RTCSessionDescription(answer)
      )
      setCallState('connected')
    } catch (err) {
      console.error('Handle answer error:', err)
    }
  }

  const handleRemoteIce = async ({ candidate }) => {
    try {
      await peerRef.current?.addIceCandidate(
        new RTCIceCandidate(candidate)
      )
    } catch (err) {
      console.error('ICE error:', err)
    }
  }

  const handleCallRejected = () => {
    setCallState('rejected')
    setTimeout(onClose, 2000)
  }

  const handleRemoteEnd = () => {
    setCallState('ended')
    setTimeout(onClose, 1500)
  }

  const rejectCall = () => {
    socket.emit('call_rejected', { caller_id: callerId })
    cleanup()
    onClose()
  }

  const endCall = () => {
    socket.emit('call_ended', { target_user_id: remoteUser.id })
    cleanup()
    onClose()
  }

  const cleanup = () => {
    clearInterval(timerRef.current)
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    peerRef.current?.close()
    peerRef.current = null
    localStreamRef.current = null
  }

  const toggleMute = () => {
    const audioTrack = localStreamRef.current
      ?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setMuted(!audioTrack.enabled)
    }
  }

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current
      ?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setCameraOff(!videoTrack.enabled)
    }
  }

  const avatarUrl = getAvatarUrl(remoteUser?.avatar_url)

  // ---- RENDER ----

  if (callState === 'incoming') {
    return (
      <div style={styles.overlay}>
        <div style={styles.incomingCard}>
          <p style={styles.incomingLabel}>
            {isVideo ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}
          </p>

          {avatarUrl ? (
            <img src={avatarUrl} style={styles.bigAvatar} alt="" />
          ) : (
            <div style={styles.bigAvatarPlaceholder}>
              {getInitial(remoteUser?.username)}
            </div>
          )}

          <p style={styles.callerName}>{remoteUser?.username}</p>

          <div style={styles.incomingActions}>
            <button style={styles.rejectBtn} onClick={rejectCall}>
              ✕ Decline
            </button>
            <button style={styles.acceptBtn} onClick={acceptCall}>
              ✓ Accept
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.callScreen}>

        {/* Video area */}
        {isVideo ? (
          <div style={styles.videoArea}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={styles.remoteVideo}
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={styles.localVideo}
            />
          </div>
        ) : (
          <div style={styles.voiceArea}>
            {avatarUrl ? (
              <img src={avatarUrl} style={styles.bigAvatar} alt="" />
            ) : (
              <div style={styles.bigAvatarPlaceholder}>
                {getInitial(remoteUser?.username)}
              </div>
            )}
            <p style={styles.callerName}>{remoteUser?.username}</p>
            <p style={styles.callStatus}>
              {callState === 'calling' && 'Calling...'}
              {callState === 'connecting' && 'Connecting...'}
              {callState === 'connected' && formatDuration(callDuration)}
              {callState === 'rejected' && 'Call declined'}
              {callState === 'ended' && 'Call ended'}
            </p>
          </div>
        )}

        {/* Controls */}
        {(callState === 'calling' ||
          callState === 'connecting' ||
          callState === 'connected') && (
          <div style={styles.controls}>
            <button
              style={{
                ...styles.controlBtn,
                backgroundColor: muted ? '#e53935' : 'rgba(255,255,255,0.2)'
              }}
              onClick={toggleMute}
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🎤'}
            </button>

            {isVideo && (
              <button
                style={{
                  ...styles.controlBtn,
                  backgroundColor: cameraOff
                    ? '#e53935'
                    : 'rgba(255,255,255,0.2)'
                }}
                onClick={toggleCamera}
                title={cameraOff ? 'Camera on' : 'Camera off'}
              >
                {cameraOff ? '📵' : '📷'}
              </button>
            )}

            <button
              style={{
                ...styles.controlBtn,
                backgroundColor: '#e53935',
                width: 60,
                height: 60
              }}
              onClick={endCall}
              title="End call"
            >
              📵
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  incomingCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: '40px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    minWidth: 280
  },
  incomingLabel: {
    color: '#aaa',
    fontSize: 14,
    margin: 0
  },
  callScreen: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  videoArea: {
    position: 'relative',
    backgroundColor: '#000',
    height: 400
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  localVideo: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 100,
    height: 140,
    objectFit: 'cover',
    borderRadius: 10,
    border: '2px solid white'
  },
  voiceArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '50px 20px 30px',
    gap: 12
  },
  bigAvatar: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #25d366'
  },
  bigAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    backgroundColor: '#075e54',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    border: '3px solid #25d366'
  },
  callerName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    margin: 0
  },
  callStatus: {
    color: '#aaa',
    fontSize: 14,
    margin: 0
  },
  incomingActions: {
    display: 'flex',
    gap: 24,
    marginTop: 8
  },
  rejectBtn: {
    padding: '12px 28px',
    backgroundColor: '#e53935',
    color: 'white',
    border: 'none',
    borderRadius: 30,
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: '600'
  },
  acceptBtn: {
    padding: '12px 28px',
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: 30,
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: '600'
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    padding: '20px',
    backgroundColor: '#111'
  },
  controlBtn: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}