import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useChatStore = create(
  persist(
    (set) => ({
      sessions: [],
      activeSessionId: null,
      messages: [],
      chatMode: 'general', // general, code, interview, eli5, rag
      isLoading: false,
      error: null,

      setActiveSesseion: (sessionId) => set({ activeSessionId: sessionId }),
      setChatMode: (mode) => set({ chatMode: mode }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      updateStreamingMessage: (content) =>
        set((state) => {
          const messages = [...state.messages]
          const lastIndex = messages.length - 1

          if (
            lastIndex >= 0 &&
            messages[lastIndex].role === 'assistant' &&
            messages[lastIndex].streaming
          ) {
            messages[lastIndex] = { ...messages[lastIndex], content }
          } else {
            messages.push({ role: 'assistant', content, streaming: true })
          }

          return { messages }
        }),
      finishStreamingMessage: () =>
        set((state) => ({
          messages: state.messages.map((message, index) =>
            index === state.messages.length - 1 && message.streaming
              ? { ...message, streaming: false }
              : message
          ),
        })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setSessions: (sessions) => set({ sessions }),
      clearChat: () => set({ messages: [], activeSessionId: null }),
    }),
    {
      name: 'chat-storage',
      version: 2,
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
        chatMode: state.chatMode,
      }),
      migrate: (persistedState) => ({
        activeSessionId: persistedState?.activeSessionId || null,
        chatMode: persistedState?.chatMode || 'general',
      }),
    }
  )
)
