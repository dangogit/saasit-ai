import React, { useState } from 'react';
import { X, Mail, Zap, Clock, CheckCircle, Loader } from 'lucide-react';

const ComingSoonModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if email already submitted
    const existingEmails = JSON.parse(localStorage.getItem('saasit-waitlist') || '[]');
    if (existingEmails.includes(email.toLowerCase())) {
      setError('This email is already on our waitlist');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      // Store email in localStorage (temporary solution)
      const updatedEmails = [...existingEmails, email.toLowerCase()];
      localStorage.setItem('saasit-waitlist', JSON.stringify(updatedEmails));

      setIsSubmitting(false);
      setIsSubmitted(true);

      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset states after modal closes
        setTimeout(() => {
          setIsSubmitted(false);
          setEmail('');
          setError('');
        }, 300);
      }, 2000);
    }, 1500);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset states after modal closes
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail('');
        setError('');
      }, 300);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 relative animate-scale-in"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
          style={{ opacity: isSubmitting ? 0.5 : 1 }}
        >
          <X size={16} />
        </button>

        <div className="p-8">
          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap size={28} className="text-blue-600" />
                </div>
                <h2 className="heading-2 mb-3">Cloud Execution</h2>
                <h3 className="text-2xl font-semibold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
                  Coming Soon!
                </h3>
                <p className="body-medium opacity-80">
                  We're building the world's most powerful AI agent execution platform. Be the first to experience it.
                </p>
              </div>

              {/* Features Preview */}
              <div className="mb-8">
                <div className="grid gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Real Cloud Execution</h4>
                      <p className="text-sm opacity-70">Your agents run on powerful cloud infrastructure with access to real tools and APIs</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">6-Hours Delivery Promise</h4>
                      <p className="text-sm opacity-70">Complete applications delivered in 6 days or less, guaranteed</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Production-Ready Output</h4>
                      <p className="text-sm opacity-70">Get deployment-ready code with full documentation and testing</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Join the waitlist for early access
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50"
                      style={{
                        borderColor: error ? '#ef4444' : 'var(--border-input)',
                        backgroundColor: 'var(--bg-card)'
                      }}
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Joining Waitlist...
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      Get Early Access
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-center opacity-60 mt-4">
                We'll notify you as soon as cloud execution is available. No spam, unsubscribe anytime.
              </p>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h3 className="heading-3 mb-3">You're on the list!</h3>
              <p className="body-medium opacity-80 mb-4">
                Thanks for joining our waitlist. We'll notify you as soon as cloud execution is ready.
              </p>
              <div className="text-sm font-mono opacity-60 bg-green-50 rounded-lg px-4 py-2 inline-block">
                {email}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComingSoonModal;