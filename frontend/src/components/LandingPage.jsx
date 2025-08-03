import React from 'react';
import { ChevronRight, Sparkles, Users, Zap, Clock, Shield, ArrowRight } from 'lucide-react';
import { pricingTiers } from '../data/mock';

const LandingPage = ({ onGetStarted }) => {
  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="header-nav">
        <div className="container">
          <div className="flex items-center justify-between w-full">
            <div className="logo font-mono">SaasIt.ai</div>
            <div className="nav-actions">
              <button className="btn-secondary">Sign In</button>
              <button className="btn-primary" onClick={handleGetStarted}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-announcement">
            <Sparkles size={16} />
            <span>Visual AI Team Orchestrator</span>
          </div>
          
          <h1 className="heading-hero mb-6">
            Design your AI dev team visually,<br />
            then watch them build your app
          </h1>
          
          <p className="body-large mb-8 text-center max-w-2xl mx-auto">
            From idea to Git repo in hours, not weeks. Choose from 40+ specialized AI agents, 
            orchestrate them visually, and deploy to the cloud or export for Claude Code.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="btn-primary" onClick={handleGetStarted}>
              Start Building Now
            </button>
            <button className="btn-secondary">
              Watch Demo
            </button>
          </div>
          
          <p className="caption mt-4">
            No Claude Code? No problem! • Export or run in cloud
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20" style={{ background: 'var(--bg-section)' }}>
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">Why SaasIt.ai?</h2>
            <p className="body-large max-w-2xl mx-auto">
              The most intuitive way to orchestrate AI development teams
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="voice-card accent-blue text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-blue-600" size={24} />
              </div>
              <h3 className="heading-3 mb-3">Visual Team Building</h3>
              <p className="body-small">
                Drag and drop AI agents onto a canvas. No coding required to build your perfect development team.
              </p>
            </div>
            
            <div className="voice-card accent-green text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-green-600" size={24} />
              </div>
              <h3 className="heading-3 mb-3">Live Execution Canvas</h3>
              <p className="body-small">
                Watch your AI agents work in real-time. See progress, debug issues, and understand every step.
              </p>
            </div>
            
            <div className="voice-card accent-orange text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-orange-600" size={24} />
              </div>
              <h3 className="heading-3 mb-3">Hours, Not Weeks</h3>
              <p className="body-small">
                From idea to working application in hours. 10x faster than traditional development.
              </p>
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
              <div key={index} className={`voice-card ${agent.color} text-center hover-lift`}>
                <div className="text-2xl mb-3">{agent.icon}</div>
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
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-400 text-white px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="heading-2 mb-1">{tier.name}</h3>
                  <p className="caption mb-4">{tier.subtitle}</p>
                  
                  <div className="mb-6">
                    <span className="text-3xl font-bold">${tier.price}</span>
                    <span className="text-muted">{tier.period}</span>
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
            <button className="btn-secondary">
              View Professional & Enterprise Plans
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
    </div>
  );
};

export default LandingPage;