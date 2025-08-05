import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, Users, Zap, Clock, Shield, ArrowRight, X, Mail, User, MessageSquare } from 'lucide-react';
import { pricingTiers } from '../data/mock';
import WorkflowIllustration from './WorkflowIllustration';
import useAuth from '../hooks/useAuth';
import UserMenu from './ui/user-menu';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openLoginModal } = useAuth();
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  
  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/app');
    } else {
      openLoginModal();
    }
  };
  
  const handleContactSales = () => {
    setShowContactForm(true);
  };
  
  const handleCloseContactForm = () => {
    setShowContactForm(false);
    setContactForm({ name: '', email: '', message: '' });
  };
  
  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log('Contact form submitted:', contactForm);
    alert('Thank you for your message! We\'ll get back to you soon.');
    handleCloseContactForm();
  };
  
  const handleInputChange = (field, value) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="header-nav">
        <div className="container">
          <div className="flex items-center justify-between w-full">
            <div className="logo font-mono">SaasIt.ai</div>
            <div className="nav-actions">
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={openLoginModal}
                  >
                    Sign In
                  </button>
                  <button className="btn-primary" onClick={handleGetStarted}>
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        {/* Floating Agent Icons */}
        <div className="absolute top-20 left-10 text-4xl float-animation">🚀</div>
        <div className="absolute top-40 right-20 text-3xl float-animation-delayed">🎨</div>
        <div className="absolute bottom-20 left-20 text-3xl float-animation">🤖</div>
        <div className="absolute bottom-40 right-10 text-4xl float-animation-delayed">📈</div>
        
        <div className="hero-content">
          <div className="hero-announcement">
            <Sparkles size={16} />
            <span>Visual AI Team Orchestrator</span>
          </div>
          
          <h1 className="heading-hero mb-6 fade-in-up animation-delay-200">
            Design your AI dev team visually,<br />
            then watch them build your app
          </h1>
          
          <p className="body-large mb-8 text-center max-w-2xl mx-auto fade-in-up animation-delay-400">
            From idea to Git repo in hours, not weeks. Choose from 40+ specialized AI agents, 
            orchestrate them visually, and deploy to the cloud or export for Claude Code.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in-up animation-delay-600">
            <button className="btn-primary hover-lift" onClick={handleGetStarted}>
              Start Building Now
            </button>
            <button className="btn-secondary hover-lift">
              Watch Demo
            </button>
          </div>
          
          <p className="caption mt-4 fade-in-up animation-delay-800">
            No Claude Code? No problem! • Export or run in cloud
          </p>
          
          {/* Visual Workflow Illustration */}
          <WorkflowIllustration />
        </div>
      </section>

      {/* Why SaasIt.ai Section - Redesigned */}
      <section className="relative py-24 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Content */}
            <div className="fade-in-up">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono mb-6">
                <Sparkles size={16} />
                <span>Revolutionary AI Orchestration</span>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Why choose <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SaasIt.ai</span>?
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                The world's first visual AI team orchestrator that transforms how you build applications. 
                No more managing complex workflows or coordinating between different tools.
              </p>
              
              {/* Statistics */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-white/50 backdrop-blur rounded-xl border border-white/20">
                  <div className="text-3xl font-bold text-blue-600 mb-1">10x</div>
                  <div className="text-sm text-gray-600">Faster Development</div>
                </div>
                <div className="text-center p-4 bg-white/50 backdrop-blur rounded-xl border border-white/20">
                  <div className="text-3xl font-bold text-purple-600 mb-1">40+</div>
                  <div className="text-sm text-gray-600">Specialized Agents</div>
                </div>
                <div className="text-center p-4 bg-white/50 backdrop-blur rounded-xl border border-white/20">
                  <div className="text-3xl font-bold text-green-600 mb-1">5K+</div>
                  <div className="text-sm text-gray-600">Developers Trust Us</div>
                </div>
                <div className="text-center p-4 bg-white/50 backdrop-blur rounded-xl border border-white/20">
                  <div className="text-3xl font-bold text-orange-600 mb-1">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime SLA</div>
                </div>
              </div>
              
              <button className="btn-primary hover-lift" onClick={handleGetStarted}>
                Experience the Future
                <ArrowRight size={20} className="ml-2" />
              </button>
            </div>
            
            {/* Right Column - Interactive Features */}
            <div className="fade-in-up animation-delay-400">
              <div className="space-y-6">
                <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-gray-800">Visual Team Building</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Drag and drop AI agents onto a canvas. No coding required to build your perfect development team.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-gray-800">Live Execution Canvas</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Watch your AI agents work in real-time. See progress, debug issues, and understand every step.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-gray-800">Hours, Not Weeks</h3>
                      <p className="text-gray-600 leading-relaxed">
                        From idea to working application in hours. Ship 10x faster than traditional development.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Showcase */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">40+ Specialized AI Agents</h2>
            <p className="body-large max-w-2xl mx-auto">
              Every role you need, from rapid prototyping to growth hacking
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Rapid Prototyper', desc: 'MVP creation specialist', icon: '🚀', color: 'accent-blue' },
              { name: 'UI Designer', desc: 'Beautiful interfaces', icon: '🎨', color: 'accent-purple' },
              { name: 'Growth Hacker', desc: 'Viral mechanics expert', icon: '📈', color: 'accent-green' },
              { name: 'AI Engineer', desc: 'ML integration specialist', icon: '🤖', color: 'accent-orange' },
              { name: 'DevOps Automator', desc: 'Deployment & scaling', icon: '⚙️', color: 'accent-pink' },
              { name: 'Content Creator', desc: 'Marketing materials', icon: '✍️', color: 'accent-grey' },
              { name: 'Test Writer', desc: 'Quality assurance', icon: '🧪', color: 'accent-blue' },
              { name: 'Brand Guardian', desc: 'Visual consistency', icon: '🛡️', color: 'accent-green' }
            ].map((agent, index) => (
              <div key={index} className={`voice-card ${agent.color} text-center hover-lift fade-in-up`} style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-2xl mb-3 float-animation">{agent.icon}</div>
                <h3 className="heading-3 mb-2">{agent.name}</h3>
                <p className="caption">{agent.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <button className="btn-secondary">
              View All 40+ Agents
              <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20" style={{ background: 'var(--bg-section)' }}>
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">Choose Your Plan</h2>
            <p className="body-large max-w-2xl mx-auto">
              From testing to enterprise-scale development
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.slice(0, 3).map((tier) => (
              <div 
                key={tier.id} 
                className={`voice-card ${tier.color} relative ${tier.popular ? 'ring-2 ring-orange-400' : ''}`}
                style={{ paddingTop: tier.popular ? '2rem' : '1.2rem' }}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20" style={{ zIndex: 1000 }}>
                    <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-mono font-semibold uppercase tracking-wider shadow-xl border-2 border-white">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="heading-2 mb-1">{tier.name}</h3>
                  <p className="caption mb-4">{tier.subtitle}</p>
                  
                  <div className="mb-6">
                    <span className="text-3xl font-bold">${tier.price}</span>
                    <span className="text-lg font-medium opacity-70 ml-1">{tier.period}</span>
                  </div>
                  
                  <p className="body-small mb-6">{tier.description}</p>
                  
                  <button className={`w-full ${tier.popular ? 'btn-primary' : 'btn-secondary'} mb-6`}>
                    {tier.cta}
                  </button>
                  
                  <div className="text-left">
                    {tier.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3 mb-2">
                        <div className="w-4 h-4 rounded-full bg-green-400 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="body-small">{feature}</span>
                      </div>
                    ))}
                    
                    {tier.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-start gap-3 mb-2">
                        <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center mt-0.5">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                        <span className="body-small text-muted">{limitation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="body-small mb-4">Need more power?</p>
            <button className="btn-secondary" onClick={handleContactSales}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="heading-1 mb-6">
              Ready to build your next app with AI?
            </h2>
            <p className="body-large mb-8">
              Join thousands of developers and founders using SaasIt.ai to ship faster
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="btn-primary" onClick={handleGetStarted}>
                Start Building Now
                <ChevronRight size={20} className="ml-2" />
              </button>
              <button className="btn-secondary">
                Schedule Demo
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-8 text-muted">
              <div className="flex items-center gap-2">
                <Shield size={16} />
                <span className="caption">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span className="caption">99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span className="caption">5000+ Developers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t" style={{ borderColor: 'var(--border-light)' }}>
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="logo font-mono mb-4 md:mb-0">SaasIt.ai</div>
            <div className="flex items-center gap-6">
              <button className="caption hover:text-primary transition-colors">Privacy</button>
              <button className="caption hover:text-primary transition-colors">Terms</button>
              <button className="caption hover:text-primary transition-colors">Support</button>
            </div>
          </div>
          <div className="text-center mt-8">
            <p className="caption">
              © 2025 SaasIt.ai. Empowering developers with visual AI orchestration.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Contact Sales Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Contact Sales</h2>
                <button 
                  onClick={handleCloseContactForm}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* Description */}
              <p className="text-gray-600 mb-6">
                Ready to scale your development with enterprise features? Let's discuss your needs.
              </p>
              
              {/* Contact Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User size={16} className="inline mr-2" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail size={16} className="inline mr-2" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare size={16} className="inline mr-2" />
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us about your project and requirements..."
                  />
                </div>
                
                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseContactForm}
                    className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              </form>
              
              {/* Contact Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  Or email us directly at{' '}
                  <a href="mailto:sales@saasit.ai" className="text-blue-600 hover:underline">
                    sales@saasit.ai
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;