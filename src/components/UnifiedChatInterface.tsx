'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Heart, User, Loader2, Sparkles, Brain, Menu, MessageSquare, ThumbsUp, ThumbsDown, MessageCircle, Star, Edit3, Calendar, MapPin } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { ChatMessage } from '@/types'
import { useChatPersistence } from '@/hooks/useChatPersistence'
import { ChatSidebar } from './ChatSidebar'
import { storeFeedback } from '@/lib/feedback'

export function UnifiedChatInterface() {
  const {
    messages,
    setMessages,
    currentSessionId,
    sessions,
    isLoading: persistenceLoading,
    createNewSession,
    loadSession,
    deleteSession,
    clearAllSessions,
    exportSessions,
    importSessions,
  } = useChatPersistence()

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [feedbackStates, setFeedbackStates] = useState<Record<string, { type: string; loading: boolean }>>({})
  const [detailedFeedback, setDetailedFeedback] = useState<Record<string, { open: boolean; rating: number; comment: string }>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat-unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input.trim(),
          chatId: currentSessionId,
          chatHistory: messages
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        sources: data.sources || [],
        metadata: data.metadata || {},
        classification: data.classification || null,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again, and if the issue persists, I&apos;ll do my best to help with a different approach.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (messageId: string, type: string, userQuery: string, aiResponse: string) => {
    // Set loading state
    setFeedbackStates(prev => ({
      ...prev,
      [messageId]: { type, loading: true }
    }))

    try {
      await storeFeedback(
        userQuery,
        aiResponse,
        type,
        currentSessionId
      )

      // Set success state
      setFeedbackStates(prev => ({
        ...prev,
        [messageId]: { type, loading: false }
      }))

      // Clear after 2 seconds
      setTimeout(() => {
        setFeedbackStates(prev => {
          const newState = { ...prev }
          delete newState[messageId]
          return newState
        })
      }, 2000)

    } catch (error) {
      console.error('Error storing feedback:', error)
      setFeedbackStates(prev => {
        const newState = { ...prev }
        delete newState[messageId]
        return newState
      })
    }
  }

  const handleDetailedFeedback = async (messageId: string, rating: number, comment: string, userQuery: string, aiResponse: string) => {
    try {
      await storeFeedback(
        userQuery,
        aiResponse,
        'detailed',
        currentSessionId,
        rating,
        comment
      )

      // Close the detailed feedback panel
      setDetailedFeedback(prev => ({
        ...prev,
        [messageId]: { ...prev[messageId], open: false }
      }))

      // Show success feedback
      setFeedbackStates(prev => ({
        ...prev,
        [messageId]: { type: 'detailed', loading: false }
      }))

      setTimeout(() => {
        setFeedbackStates(prev => {
          const newState = { ...prev }
          delete newState[messageId]
          return newState
        })
      }, 2000)

    } catch (error) {
      console.error('Error storing detailed feedback:', error)
    }
  }

  const openDetailedFeedback = (messageId: string) => {
    setDetailedFeedback(prev => ({
      ...prev,
      [messageId]: {
        open: true,
        rating: prev[messageId]?.rating || 0,
        comment: prev[messageId]?.comment || ''
      }
    }))
  }

  const quickActions = [
    { 
      label: "Find wedding venues near me", 
      icon: <MapPin className="w-4 h-4" />, 
      query: "Show me wedding venues in my area",
      description: "Discover beautiful venue options"
    },
    { 
      label: "Wedding planning timeline", 
      icon: <Calendar className="w-4 h-4" />, 
      query: "Give me a complete wedding planning timeline and checklist",
      description: "Get organized with timeline"
    },
    { 
      label: "Wedding budget advice", 
      icon: <Brain className="w-4 h-4" />, 
      query: "Help me create a realistic wedding budget",
      description: "Smart budgeting guidance"
    },
    { 
      label: "Vendor recommendations", 
      icon: <Sparkles className="w-4 h-4" />, 
      query: "Recommend wedding vendors like photographers and florists",
      description: "Find trusted wedding professionals"
    }
  ]

  if (persistenceLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg h-[800px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-rose-500" />
          <p className="text-gray-600">Loading Shapash...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewSession={createNewSession}
        onLoadSession={loadSession}
        onDeleteSession={deleteSession}
        onClearAll={clearAllSessions}
        onExport={exportSessions}
        onImport={importSessions}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="bg-white rounded-lg shadow-lg h-[800px] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
                title="Chat History"
              >
                <Menu className="w-5 h-5 text-rose-600" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">Shapash</h2>
                <p className="text-sm text-rose-600 mt-1">
                  Your AI Wedding Planning Expert • Personalized advice for your perfect day
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={createNewSession}
                className="px-4 py-2 text-sm bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:from-rose-600 hover:to-pink-600 transition-all shadow-md"
              >
                New Chat
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="p-6 border-b border-rose-100">
            <h3 className="text-sm font-semibold text-rose-700 mb-3">Start your wedding planning journey:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInput(action.query)}
                  className="flex items-start gap-3 p-3 text-left border border-rose-200 rounded-lg hover:bg-rose-50 hover:border-rose-300 transition-colors group"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                    {action.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{action.label}</div>
                    <div className="text-xs text-rose-600 mt-1">{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-rose-700 mt-8">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-rose-600" />
              </div>
              <p className="text-lg font-medium">Welcome to Shapash</p>
              <p className="text-sm mt-2">Your AI Wedding Planning Expert</p>
              <p className="text-xs mt-2 text-rose-500">
                Ask me about venues, vendors, timelines, budgets, or any wedding planning questions
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="space-y-4">
              <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' 
                    : 'bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                </div>
                <div className={`rounded-xl p-4 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' 
                    : 'bg-rose-50 text-gray-800 border border-rose-200'
                }`}>
                  {message.role === 'user' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Feedback System */}
              {message.role === 'assistant' && (
                <div className="ml-13 space-y-3">
                  {/* Quick Feedback Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 mr-2">Was this helpful?</div>
                    <button
                      onClick={() => {
                        const userQuery = messages[messages.indexOf(message) - 1]?.content || ''
                        handleFeedback(message.id, 'helpful', userQuery, message.content)
                      }}
                      disabled={feedbackStates[message.id]?.loading}
                      className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition-colors ${
                        feedbackStates[message.id]?.type === 'helpful'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      {feedbackStates[message.id]?.loading && feedbackStates[message.id]?.type === 'helpful' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Helpful'
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        const userQuery = messages[messages.indexOf(message) - 1]?.content || ''
                        handleFeedback(message.id, 'not_helpful', userQuery, message.content)
                      }}
                      disabled={feedbackStates[message.id]?.loading}
                      className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition-colors ${
                        feedbackStates[message.id]?.type === 'not_helpful'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      <ThumbsDown className="w-3 h-3" />
                      {feedbackStates[message.id]?.loading && feedbackStates[message.id]?.type === 'not_helpful' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Not helpful'
                      )}
                    </button>

                    <button
                      onClick={() => openDetailedFeedback(message.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Give feedback
                    </button>
                  </div>

                  {/* Detailed Feedback Panel */}
                  {detailedFeedback[message.id]?.open && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Share your feedback</h4>
                      
                      {/* Star Rating */}
                      <div className="mb-3">
                        <label className="text-xs text-gray-600 mb-2 block">How would you rate this response?</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setDetailedFeedback(prev => ({
                                ...prev,
                                [message.id]: { ...prev[message.id], rating: star }
                              }))}
                              className={`w-6 h-6 ${
                                star <= (detailedFeedback[message.id]?.rating || 0)
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              } hover:text-yellow-400 transition-colors`}
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment */}
                      <div className="mb-3">
                        <label className="text-xs text-gray-600 mb-2 block">Additional comments (optional)</label>
                        <textarea
                          value={detailedFeedback[message.id]?.comment || ''}
                          onChange={(e) => setDetailedFeedback(prev => ({
                            ...prev,
                            [message.id]: { ...prev[message.id], comment: e.target.value }
                          }))}
                          placeholder="Tell us how we can improve..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={3}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const feedback = detailedFeedback[message.id]
                            const userQuery = messages[messages.indexOf(message) - 1]?.content || ''
                            handleDetailedFeedback(message.id, feedback.rating, feedback.comment, userQuery, message.content)
                          }}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => setDetailedFeedback(prev => ({
                            ...prev,
                            [message.id]: { ...prev[message.id], open: false }
                          }))}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sources and Classification */}
              {message.role === 'assistant' && (message.classification || message.sources?.length) && (
                <div className="ml-13 space-y-2">
                  {message.classification && (
                    <div className="text-xs text-gray-500 bg-gray-100 rounded-lg p-2">
                      <span className="font-medium">Query Type:</span> {message.classification.type.replace('_', ' ')} 
                      <span className="mx-2">•</span>
                      <span className="font-medium">Confidence:</span> {(message.classification.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <div className="font-medium text-gray-700 mb-2">
                        💖 Sources ({message.sources.length}) - Relevance Scores:
                      </div>
                      {message.sources.slice(0, 5).map((source: any, index: number) => (
                        <div key={index} className="ml-2 mb-1 p-2 bg-rose-50 rounded border-l-2 border-rose-200">
                          <div className="font-medium text-gray-800">
                            {index + 1}. &quot;{source.title}&quot; {source.author && `by ${source.author}`}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-gray-500">
                              Type: {source.doc_type || 'Wedding Resource'}
                            </div>
                            {source.similarity && (
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                source.similarity >= 0.8 ? 'bg-green-100 text-green-700' :
                                source.similarity >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {Math.round(source.similarity * 100)}% relevant
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {message.sources.length > 5 && (
                        <div className="ml-2 text-gray-500 mt-1">
                          + {message.sources.length - 5} more sources
                        </div>
                      )}
                      {message.metadata?.avgRelevance && (
                        <div className="ml-2 mt-2 text-gray-500 font-medium">
                          Average relevance: {message.metadata.avgRelevance}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-rose-600" />
              </div>
              <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  <span className="text-sm text-rose-600">Shapash is planning something special...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-rose-200">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Shapash about wedding planning, venues, vendors, timelines, or anything for your special day..."
              className="flex-1 px-4 py-3 border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          
          <div className="mt-2 text-xs text-rose-500 text-center">
            Try: &quot;Find venues near me&quot; • &quot;Wedding planning timeline&quot; • &quot;Budget advice&quot; • &quot;Vendor recommendations&quot;
          </div>
        </div>
      </div>
    </>
  )
} 