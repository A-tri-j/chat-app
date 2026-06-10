import { create } from 'zustand'

const useStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token'),
  chats: [],
  activeChat: null,
  messages: [],

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },

  setChats: (chats) => set({ chats }),
  setActiveChat: (chat) => set({ activeChat: chat, messages: [] }),
  setMessages: (messages) => set({ messages }),

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg]
  })),

  // delete for me — remove from list
  deleteMessageForMe: (messageId) => set((state) => ({
    messages: state.messages.filter((m) => m.id !== messageId)
  })),

  // delete for everyone — replace with deleted placeholder
  deleteMessageForEveryone: (messageId) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId
        ? {
            ...m,
            message: null,
            message_type: 'deleted',
            file_url: null,
            file_name: null
          }
        : m
    )
  })),

  // mark view once as opened locally
  markViewOnceOpened: (messageId) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId
        ? {
            ...m,
            view_once_opened: true,
            file_url: null,
            file_name: null
          }
        : m
    )
  })),

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({
      user: null,
      token: null,
      chats: [],
      activeChat: null,
      messages: []
    })
  }
}))

export default useStore