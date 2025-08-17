import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  ArrowRight,
  Brain,
  Lightbulb,
  CheckCircle,
  Clock,
  User,
  Bot,
  Sparkles,
  Target,
  Users,
  Calendar,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

import useOnboardingStore from '../../stores/onboardingStore';

const AIQuestionFlow = ({ onComplete, onSkip }) => {
  const { getToken } = useAuth();
  const {
    onboardingState,
    setCurrentQuestion,
    addQuestionToHistory,
    setQuestionQueue,
    getNextQuestion,
    updateConversationContext,
    setAIRecommendations,
    setLoading,
    setError,
    clearError
  } = useOnboardingStore();

  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionPhase, setQuestionPhase] = useState('initial'); // 'initial' | 'asking' | 'complete'
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages appear
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [onboardingState.questionHistory, onboardingState.currentQuestion]);

  // Start the questioning flow
  const startQuestionFlow = async () => {
    setConversationStarted(true);
    setQuestionPhase('asking');
    clearError();
    
    try {
      setLoading(true, 'Starting conversation...');
      
      // Get the first question based on project context
      const firstQuestion = await getNextQuestionFromAPI({
        question_id: 'initial',
        answer: '',
        context: {
          projectType: onboardingState.projectType,
          projectName: onboardingState.projectName,
          hasClaudeCode: onboardingState.hasClaudeCode,
          githubConnected: onboardingState.githubConnected,
          workMode: onboardingState.workMode
        }
      });

      if (firstQuestion) {
        setCurrentQuestion(firstQuestion);
        setQuestionPhase('asking');
      }
    } catch (error) {
      console.error('Failed to start question flow:', error);
      setError(`Failed to start conversation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next question from API
  const getNextQuestionFromAPI = async (answerData) => {
    try {
      const token = await getToken();
      
      const response = await fetch('/api/v1/onboarding/next-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(answerData)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const questionData = await response.json();
      return questionData;
    } catch (error) {
      console.error('Failed to get next question:', error);
      throw error;
    }
  };

  // Submit current answer and get next question
  const submitAnswer = async (e) => {
    e?.preventDefault();
    
    if (!currentAnswer.trim() || isSubmitting || !onboardingState.currentQuestion) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      // Add current Q&A to history
      addQuestionToHistory(onboardingState.currentQuestion, currentAnswer.trim());
      
      // Update conversation context
      updateConversationContext({
        lastAnswer: currentAnswer.trim(),
        questionCount: onboardingState.questionHistory.length + 1
      });

      // Get next question
      const nextQuestion = await getNextQuestionFromAPI({
        question_id: onboardingState.currentQuestion.question_id,
        answer: currentAnswer.trim(),
        context: {
          projectType: onboardingState.projectType,
          projectName: onboardingState.projectName,
          hasClaudeCode: onboardingState.hasClaudeCode,
          githubConnected: onboardingState.githubConnected,
          workMode: onboardingState.workMode,
          previousAnswers: onboardingState.questionHistory.map(h => ({
            question: h.question.question,
            answer: h.answer
          }))
        }
      });

      // Clear current answer
      setCurrentAnswer('');

      if (nextQuestion && !nextQuestion.is_final) {
        // Set next question
        setCurrentQuestion(nextQuestion);
      } else {
        // Conversation complete
        setQuestionPhase('complete');
        setCurrentQuestion(null);
        
        // Generate AI recommendations based on conversation
        if (nextQuestion && nextQuestion.context) {
          setAIRecommendations({
            recommendations: nextQuestion.context,
            confidence: 0.85,
            reasoning: nextQuestion.reasoning || 'Based on your responses, here are my recommendations.'
          });
        }
        
        // Auto-complete after a brief delay to show completion state
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setError(`Failed to process answer: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey && currentAnswer.trim()) {
        event.preventDefault();
        submitAnswer();
      }
    };

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('keydown', handleKeyDown);
      return () => inputElement.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentAnswer]);

  // Auto-focus input when question changes
  useEffect(() => {
    if (onboardingState.currentQuestion && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [onboardingState.currentQuestion]);

  const renderInitialState = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
        <Brain size={32} className="text-white" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">Let's Design Your AI Team</h2>
      <p className="text-white/80 text-lg mb-8 leading-relaxed">
        I'll ask you a few questions to understand your project and recommend the perfect AI agents. 
        This takes just 2-3 minutes and helps create a customized development experience.
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={20} className="text-blue-300" />
          </div>
          <h3 className="font-semibold text-white mb-2">One at a Time</h3>
          <p className="text-white/70 text-sm">
            I'll ask one focused question at a time for a natural conversation
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Brain size={20} className="text-purple-300" />
          </div>
          <h3 className="font-semibold text-white mb-2">Smart Reasoning</h3>
          <p className="text-white/70 text-sm">
            Each question builds on your previous answers using AI reasoning
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Target size={20} className="text-green-300" />
          </div>
          <h3 className="font-semibold text-white mb-2">Personalized</h3>
          <p className="text-white/70 text-sm">
            Get AI agent recommendations tailored specifically to your needs
          </p>
        </div>
      </div>

      <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Lightbulb size={18} className="text-blue-300" />
          <span className="font-medium text-blue-100">What I'll ask about:</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-200/90">
          <div className="flex items-center gap-2">
            <Target size={14} />
            <span>Your project goals</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} />
            <span>Target users</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>Timeline preferences</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={14} />
            <span>Technical preferences</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => onSkip?.('conversation-skipped')}
          className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Skip Questions
        </button>
        
        <button
          onClick={startQuestionFlow}
          disabled={onboardingState.isLoading}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          {onboardingState.isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Starting...
            </>
          ) : (
            <>
              Start Conversation
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderConversation = () => (
    <div className="max-w-4xl mx-auto">
      {/* Conversation Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
            <Brain size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">AI Assistant</h2>
        </div>
        <p className="text-white/70">
          Question {onboardingState.questionHistory.length + 1} • 
          {onboardingState.currentQuestion ? ' Answer to continue' : ' Generating recommendations...'}
        </p>
      </div>

      {/* Messages Container */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-6 max-h-96 overflow-y-auto">
        <div className="space-y-6">
          {/* Previous Q&A */}
          {onboardingState.questionHistory.map((item, index) => (
            <div key={index} className="space-y-4">
              {/* Question */}
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl p-4 border border-purple-400/30">
                    <p className="text-white">{item.question.question}</p>
                    {item.question.reasoning && (
                      <p className="text-purple-200/70 text-sm mt-2 italic">
                        {item.question.reasoning}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Answer */}
              <div className="flex gap-4 justify-end">
                <div className="flex-1 max-w-lg">
                  <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30">
                    <p className="text-white">{item.answer}</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
              </div>
            </div>
          ))}

          {/* Current Question */}
          {onboardingState.currentQuestion && (
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl p-4 border border-purple-400/30">
                  <p className="text-white">{onboardingState.currentQuestion.question}</p>
                  {onboardingState.currentQuestion.reasoning && (
                    <p className="text-purple-200/70 text-sm mt-2 italic">
                      {onboardingState.currentQuestion.reasoning}
                    </p>
                  )}
                  {onboardingState.currentQuestion.context && (
                    <p className="text-purple-200/60 text-xs mt-2">
                      💡 {onboardingState.currentQuestion.context}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Typing indicator when submitting */}
          {isSubmitting && (
            <div className="flex gap-4 justify-end">
              <div className="flex-1 max-w-lg">
                <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30">
                  <p className="text-white">{currentAnswer}</p>
                </div>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {onboardingState.currentQuestion && (
        <form onSubmit={submitAnswer} className="space-y-4">
          {/* Question Type Specific Input */}
          {onboardingState.currentQuestion.question_type === 'single_choice' && onboardingState.currentQuestion.options ? (
            <div className="grid gap-3">
              {onboardingState.currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setCurrentAnswer(option);
                    // Auto-submit single choice answers after a brief delay
                    setTimeout(() => {
                      if (!isSubmitting) {
                        submitAnswer();
                      }
                    }, 300);
                  }}
                  className={`p-4 rounded-xl transition-all duration-300 text-left hover:scale-105 ${
                    currentAnswer === option
                      ? 'bg-blue-500/30 border border-blue-400/50 text-white shadow-lg'
                      : 'bg-white/10 border border-white/20 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            // Text input for open-ended questions
            <div className="flex gap-4">
              <textarea
                ref={inputRef}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                rows="3"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={!currentAnswer.trim() || isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          )}

          {/* Hint */}
          <div className="text-center">
            <p className="text-white/50 text-sm">
              {onboardingState.currentQuestion.question_type === 'single_choice' 
                ? 'Click an option to select it' 
                : 'Press Enter to send, Shift+Enter for new line'
              }
            </p>
          </div>
        </form>
      )}

      {/* Error Display */}
      {onboardingState.error && (
        <div className="mt-4 bg-red-500/20 backdrop-blur-sm rounded-xl p-4 border border-red-400/30">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-red-300" />
            <p className="text-red-200">{onboardingState.error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderComplete = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
        <CheckCircle size={32} className="text-white" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">Perfect! 🎉</h2>
      <p className="text-white/80 text-lg mb-8">
        Thanks for sharing your project details. I now have enough information to recommend the perfect AI agents for your needs.
      </p>

      <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30 mb-8">
        <h3 className="font-semibold text-green-100 mb-4 flex items-center gap-2 justify-center">
          <Sparkles size={20} />
          What's Next
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={16} className="text-green-300" />
              <span className="text-green-100 font-medium">AI Analysis</span>
            </div>
            <p className="text-green-200/80">Analyzing your answers to recommend agents</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-green-300" />
              <span className="text-green-100 font-medium">Custom Workflow</span>
            </div>
            <p className="text-green-200/80">Creating a tailored development workflow</p>
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
        <p className="text-white/70 text-sm">
          Automatically continuing to template selection in a few seconds...
        </p>
        <div className="mt-3">
          <div className="w-full bg-white/20 rounded-full h-1">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-1 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render logic
  if (questionPhase === 'complete') {
    return renderComplete();
  }

  if (conversationStarted || onboardingState.currentQuestion) {
    return renderConversation();
  }

  return renderInitialState();
};

export default AIQuestionFlow;