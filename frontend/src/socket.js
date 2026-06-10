import { io } from 'socket.io-client'

let socket = null

export const connectSocket = (token) => {
  if (socket && socket.connected) return socket

  socket = io('http://localhost:8000', {
    auth: { token },
    transports: ['websocket']
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected')
  })

  socket.on('connect_error', (err) => {
    console.log('Socket connection error:', err.message)
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}