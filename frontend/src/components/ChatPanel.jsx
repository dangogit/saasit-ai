import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle } from 'lucide-react';
import { chatMessages } from '../data/mock';
import apiClient from '../services/api';
import useWorkflowStore from '../lib/stores/workflowStore';

const ChatPanel = ({ onAddAgent }) => {
  const [messages, setMessages] = useState(chatMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [useStreaming, setUseStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const wsClient = useRef(null);
  
  const { 
    updateProjectContext, 
    setConversationPhase,
    generateWorkflowFromAI,
    addConversationMessage,
    conversationPhase
  } = useWorkflowStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize WebSocket connection for streaming
  useEffect(() => {
    if (useStreaming) {
      initializeWebSocket();
    }
    
    return () => {
      if (wsClient.current) {
        wsClient.current.close();
      }
    };
  }, [useStreaming]);

  const initializeWebSocket = async () => {
    try {
      wsClient.current = apiClient.connectWebSocket();
      
      wsClient.current.onMessage((data) => {
        handleWebSocketMessage(data);
      });
      
      wsClient.current.onError((error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Falling back to REST API.');
        setUseStreaming(false);
      });
      
      wsClient.current.onClose(() => {
        setIsConnected(false);
      });
      
      await wsClient.current.connect();
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setUseStreaming(false);
    }
  };

  const handleWebSocketMessage = (data) => {
    if (data.type === 'delta') {
      // Update the last AI message with streaming content
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === 'ai' && lastMessage.isStreaming) {
          lastMessage.content += data.content;
        }
        return newMessages;
      });
    } else if (data.type === 'complete') {
      // Finalize the streaming message
      setIsTyping(false);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.isStreaming) {
          lastMessage.isStreaming = false;
          
          // Handle workflow generation
          if (data.response && data.response.workflow) {
            handleWorkflowResponse(data.response);
          }
        }
        return newMessages;
      });
    } else if (data.type === 'error') {
      setError(data.error);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);
    setError(null);

    // Prepare conversation history
    const conversationHistory = messages
      .filter(msg => !msg.isStreaming)
      .map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
    
    conversationHistory.push({
      role: 'user',
      content: newMessage.content
    });

    try {
      if (useStreaming && wsClient.current && isConnected) {
        // Use WebSocket for streaming
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: '',
          timestamp: new Date(),
          isStreaming: true
        };
        setMessages(prev => [...prev, aiMessage]);
        
        wsClient.current.send({
          messages: conversationHistory
        });
      } else {
        // Use REST API
        const response = await apiClient.sendChatMessage(conversationHistory);
        
        if (response.response) {
          const aiResponse = {
            id: Date.now() + 1,
            type: 'ai',
            content: response.response.message || 'I understand. Let me help you with that.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiResponse]);
          
          // Handle workflow generation
          if (response.response.workflow) {
            handleWorkflowResponse(response.response);
          }
        }
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message. Please try again.');
      setIsTyping(false);
    }
  };

  const handleWorkflowResponse = async (response) => {
    if (response.phase) {
      setConversationPhase(response.phase);
    }
    
    if (response.workflow && response.workflow.agents) {
      // Generate workflow on the canvas
      await generateWorkflowFromAI(response);
      
      // Show success message
      const successMessage = {
        id: Date.now() + 3,
        type: 'ai',
        content: '✨ I\'ve created your workflow on the canvas! The agents are arranged based on their dependencies and collaboration patterns.',
        timestamp: new Date()
      };
      setTimeout(() => {
        setMessages(prev => [...prev, successMessage]);
      }, 1000);
    }
    
    if (response.questions && response.questions.length > 0) {
      // Add clarifying questions as a follow-up message
      const questionsMessage = {
        id: Date.now() + 2,
        type: 'ai',
        content: 'To better understand your needs, could you help me with:\n\n' + 
                 response.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
        timestamp: new Date()
      };
      setTimeout(() => {
        setMessages(prev => [...prev, questionsMessage]);
      }, 500);
    }
  };


  const formatMessage = (content) => {
    // Convert markdown-like formatting to JSX
    const parts = content.split('\n');
    return parts.map((part, index) => {
      if (part.startsWith('• **') && part.includes('**')) {
        const [, bold, rest] = part.match(/• \*\*(.*?)\*\* - (.*)/) || [];
        if (bold && rest) {
          return (
            <div key={index} className="flex items-start gap-2 mb-1">
              <span className="text-blue-600 font-semibold">•</span>
              <span>
                <strong className="text-blue-700">{bold}</strong> - {rest}
              </span>
            </div>
          );
        }
      }
      return part ? <div key={index}>{part}</div> : <div key={index} className="h-2"></div>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Connection Status */}
      {useStreaming && (
        <div className="px-4 py-2 text-xs text-gray-500 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          {isConnected ? 'Connected' : 'Connecting...'}
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-blue-600" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="leading-relaxed">
                {message.type === 'ai' ? formatMessage(message.content) : message.content}
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse" />
                )}
              </div>
              <div className={`text-xs mt-2 opacity-70 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
            
            {message.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot size={16} className="text-blue-600" />
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe your app idea..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
            style={{ 
              borderColor: 'var(--border-input)',
              backgroundColor: 'var(--bg-card)'
            }}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="btn-primary px-3 py-2"
          >
            <Send size={16} />
          </button>
        </form>
        
        <p className="text-xs opacity-70 mt-2">
          Describe your app and I'll suggest the perfect AI team
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;