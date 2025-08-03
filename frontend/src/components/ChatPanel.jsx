import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { chatMessages } from '../data/mock';

const ChatPanel = ({ onAddAgent }) => {
  const [messages, setMessages] = useState(chatMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: getAIResponse(newMessage.content),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getAIResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('todo') || message.includes('task') || message.includes('project management')) {
      return 'For a task management app, I recommend:\n\n• **Rapid Prototyper** - Build core task features\n• **Frontend Developer** - Create collaborative UI\n• **Backend Architect** - Design real-time sync\n• **UI Designer** - Optimize user experience\n\nWould you like me to add these agents to your canvas?';
    }
    
    if (message.includes('ecommerce') || message.includes('shop') || message.includes('store')) {
      return 'For an ecommerce platform, you\'ll need:\n\n• **Backend Architect** - Payment & inventory systems\n• **Frontend Developer** - Shopping cart UI\n• **UI Designer** - Product pages\n• **DevOps Automator** - Scaling infrastructure\n• **Analytics Reporter** - Track sales metrics\n\nShall I add these specialists to your team?';
    }
    
    if (message.includes('mobile') || message.includes('app')) {
      return 'Perfect! For a mobile app, I suggest:\n\n• **Mobile App Builder** - Native development\n• **UI Designer** - Mobile-first design\n• **Backend Architect** - API development\n• **Performance Benchmarker** - Speed optimization\n\nReady to start building your mobile team?';
    }
    
    if (message.includes('ai') || message.includes('ml') || message.includes('intelligent')) {
      return 'Great choice! For AI-powered applications:\n\n• **AI Engineer** - ML model integration\n• **Backend Architect** - Data processing pipeline\n• **Frontend Developer** - Smart UI components\n• **Test Writer & Fixer** - Model validation\n\nWant me to add these AI specialists?';
    }

    if (message.includes('yes') || message.includes('add') || message.includes('sure')) {
      return 'Awesome! I\'ve suggested some agents for you. You can drag them from the library on the right, or I can add them directly to your canvas. \n\nWhat specific features are most important for your app?';
    }
    
    return 'I can help you build the perfect AI development team! Tell me more about:\n\n• What type of app you\'re building\n• Key features you need\n• Your target platform (web, mobile, etc.)\n• Any specific technologies you prefer\n\nI\'ll recommend the best agents for your project!';
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