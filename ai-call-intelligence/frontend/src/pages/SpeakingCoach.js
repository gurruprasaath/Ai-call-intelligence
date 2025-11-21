import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, User, MessageCircle, Lightbulb, Clock, Loader, Plus, History, Menu, X, Edit2, Check, MoreVertical } from 'lucide-react';

const SpeakingCoach = () => {
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [showSessions, setShowSessions] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showSessionMenu, setShowSessionMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize chat session and load sessions on component mount
  useEffect(() => {
    loadUserSessions();
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close session menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSessionMenu && !event.target.closest('.session-menu-container')) {
        setShowSessionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSessionMenu]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserSessions = async () => {
    try {
      const token = getToken();
      const userId = user?.id || user?._id || 'anonymous';
      const response = await fetch(`http://localhost:3001/api/chat/sessions?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.sessions);
        if (data.sessions.length > 0) {
          // Load the most recent session
          loadChatSession(data.sessions[0].sessionId);
        } else {
          // No existing sessions, start a new one
          startChatSession();
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      startChatSession(); // Fallback to new session
    }
  };

  const startChatSession = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      const userId = user?.id || user?._id || 'anonymous';
      const userName = user ? `${user.firstName} ${user.lastName}` : 'User';
      const response = await fetch('http://localhost:3001/api/chat/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          userName: userName
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        setMessages([data.message]);
        setCurrentSession({
          id: data.sessionId,
          title: 'Speaking Coach Conversation',
          messageCount: 1,
          createdAt: new Date()
        });
        // Refresh sessions list
        loadUserSessions();
      } else {
        console.error('Failed to start chat session:', data.error);
      }
    } catch (error) {
      console.error('Error starting chat session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatSession = async (sessionIdToLoad) => {
    try {
      setIsLoading(true);
      const token = getToken();
      const response = await fetch(`http://localhost:3001/api/chat/${sessionIdToLoad}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setSessionId(sessionIdToLoad);
        setMessages(data.messages);
        setCurrentSession(data.session);
      } else {
        console.error('Failed to load chat session:', data.error);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRenameSession = (session) => {
    setEditingSessionId(session.sessionId);
    setEditingTitle(session.title);
    setShowSessionMenu(null);
  };

  const cancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const saveRename = async (sessionIdToRename) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:3001/api/chat/${sessionIdToRename}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editingTitle.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update local sessions list
        setSessions(sessions.map(session => 
          session.sessionId === sessionIdToRename 
            ? { ...session, title: editingTitle.trim() }
            : session
        ));
        
        // Update current session if it's the one being renamed
        if (currentSession && currentSession.id === sessionIdToRename) {
          setCurrentSession({ ...currentSession, title: editingTitle.trim() });
        }
        
        setEditingSessionId(null);
        setEditingTitle('');
      } else {
        console.error('Failed to rename session:', data.error);
        alert('Failed to rename session. Please try again.');
      }
    } catch (error) {
      console.error('Error renaming session:', error);
      alert('Error renaming session. Please try again.');
    }
  };

  const deleteSession = async (sessionIdToDelete) => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`http://localhost:3001/api/chat/${sessionIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // Remove from sessions list
        setSessions(sessions.filter(session => session.sessionId !== sessionIdToDelete));
        
        // If this was the current session, start a new one
        if (sessionId === sessionIdToDelete) {
          startChatSession();
        }
        
        setShowSessionMenu(null);
      } else {
        console.error('Failed to delete session:', data.error);
        alert('Failed to delete session. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    // Add user message to UI immediately
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      const token = getToken();
      const userId = user?.id || user?._id || 'anonymous';
      const response = await fetch(`http://localhost:3001/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message,
          userId: userId
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, data.message]);
      } else {
        console.error('Failed to send message:', data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const formatMessage = (content) => {
    // Convert markdown-like formatting to HTML
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/## (.*?)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">$1</h3>')
      .replace(/• (.*?)$/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\n/g, '<br />');
    
    return { __html: formatted };
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Starting your speaking coach session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Speaking Coach Assistant
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get personalized guidance for formal occasions, public speaking, interviews, and professional communication
          </p>
        </div>

        <div className="max-w-6xl mx-auto flex gap-6">
          {/* Sessions Sidebar */}
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-all duration-300 ${showSessions ? 'w-80' : 'w-16'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowSessions(!showSessions)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {showSessions ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                {showSessions && (
                  <button
                    onClick={startChatSession}
                    className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    title="Start new conversation"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {showSessions && (
              <div className="p-4 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Chat History
                </h3>
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={`relative group rounded-lg transition-colors ${
                        sessionId === session.sessionId
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {editingSessionId === session.sessionId ? (
                        <div className="p-3">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveRename(session.sessionId);
                              } else if (e.key === 'Escape') {
                                cancelRename();
                              }
                            }}
                            className="w-full text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <div className="flex justify-end gap-1 mt-2">
                            <button
                              onClick={() => saveRename(session.sessionId)}
                              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={cancelRename}
                              className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => loadChatSession(session.sessionId)}
                            className="w-full text-left p-3"
                          >
                            <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate pr-8">
                              {session.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {session.messageCount} messages
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(session.lastActivity).toLocaleDateString()}
                            </div>
                          </button>
                          
                          {/* Session Menu Button */}
                          <div className="absolute top-2 right-2 session-menu-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSessionMenu(showSessionMenu === session.sessionId ? null : session.sessionId);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {showSessionMenu === session.sessionId && (
                              <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50 min-w-32">
                                <button
                                  onClick={() => startRenameSession(session)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Rename
                                </button>
                                <button
                                  onClick={() => deleteSession(session.sessionId)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                                >
                                  <X className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Container */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4" style={{ maxHeight: '600px' }}>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* Message Header */}
                  <div className={`flex items-center gap-2 mb-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-center gap-2 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-green-600 text-white'
                      }`}>
                        {message.type === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {message.type === 'user' ? 'You' : 'Coach'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white ml-8'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mr-8'
                  }`}>
                    <div 
                      className={`prose prose-sm max-w-none ${
                        message.type === 'user' ? 'prose-invert' : 'dark:prose-invert'
                      }`}
                      dangerouslySetInnerHTML={formatMessage(message.content)}
                    />
                  </div>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 mr-8">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Suggestions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 mr-8">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-600 p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about speaking techniques, presentation tips, or communication advice..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                  rows="2"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => handleSuggestionClick("I need help with a job interview")}
                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Job Interview Help
              </button>
              <button
                onClick={() => handleSuggestionClick("How to overcome public speaking anxiety?")}
                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Public Speaking Anxiety
              </button>
              <button
                onClick={() => handleSuggestionClick("Tips for formal business meetings")}
                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Business Meetings
              </button>
              <button
                onClick={() => handleSuggestionClick("How to network effectively?")}
                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Networking Tips
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Personalized Guidance</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get tailored advice based on your specific speaking context and audience
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
              <Lightbulb className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Practical Tips</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Learn actionable techniques for various speaking situations and challenges
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">AI-Powered</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Intelligent responses powered by advanced AI and professional speaking expertise
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakingCoach;