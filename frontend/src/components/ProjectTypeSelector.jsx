import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, FolderOpen, Sparkles, ChevronRight, Github, Zap, Brain } from 'lucide-react';
import { useUser, SignInButton } from '@clerk/clerk-react';

const ProjectTypeSelector = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const [hoveredCard, setHoveredCard] = useState(null);

  const handleProjectTypeSelect = (type) => {
    if (isSignedIn) {
      navigate('/app/setup', { state: { projectType: type } });
    }
    // If not signed in, SignInButton will handle the modal
  };

  const ProjectCard = ({ 
    type, 
    icon: Icon, 
    title, 
    subtitle, 
    description, 
    features, 
    color, 
    gradient 
  }) => (
    <div 
      className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
        hoveredCard === type ? 'z-10' : ''
      }`}
      onMouseEnter={() => setHoveredCard(type)}
      onMouseLeave={() => setHoveredCard(null)}
      onClick={() => handleProjectTypeSelect(type)}
    >
      {/* Background card with gradient */}
      <div className={`
        relative overflow-hidden rounded-2xl p-8 h-full
        bg-gradient-to-br ${gradient}
        border border-white/20 backdrop-blur-sm
        shadow-lg hover:shadow-2xl transition-all duration-300
        ${hoveredCard === type ? 'ring-2 ring-blue-400/50' : ''}
      `}>
        {/* Floating background pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <div className={`w-full h-full rounded-full bg-white blur-xl`}></div>
        </div>
        
        {/* Icon container */}
        <div className={`
          inline-flex items-center justify-center w-16 h-16 mb-6
          rounded-xl bg-white/20 backdrop-blur-sm
          group-hover:scale-110 transition-transform duration-300
        `}>
          <Icon size={32} className="text-white drop-shadow-lg" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-sm">
            {title}
          </h3>
          <p className="text-white/90 text-lg mb-4 drop-shadow-sm">
            {subtitle}
          </p>
          <p className="text-white/80 mb-6 leading-relaxed drop-shadow-sm">
            {description}
          </p>
          
          {/* Features list */}
          <ul className="space-y-2 mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-white/90">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
                <span className="text-sm drop-shadow-sm">{feature}</span>
              </li>
            ))}
          </ul>
          
          {/* CTA */}
          <div className="flex items-center justify-between">
            {isSignedIn ? (
              <button className="
                flex items-center gap-2 px-6 py-3
                bg-white/20 hover:bg-white/30 backdrop-blur-sm
                text-white rounded-lg font-medium
                transition-all duration-200 hover:scale-105
                border border-white/20
              ">
                Get Started
                <ChevronRight size={16} />
              </button>
            ) : (
              <SignInButton mode="modal" afterSignInUrl={`/app/setup?type=${type}`}>
                <button className="
                  flex items-center gap-2 px-6 py-3
                  bg-white/20 hover:bg-white/30 backdrop-blur-sm
                  text-white rounded-lg font-medium
                  transition-all duration-200 hover:scale-105
                  border border-white/20
                ">
                  Get Started
                  <ChevronRight size={16} />
                </button>
              </SignInButton>
            )}
            
            <div className="text-white/60">
              <Sparkles size={20} className="animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Hover effect overlay */}
        <div className={`
          absolute inset-0 bg-white/5 opacity-0 
          group-hover:opacity-100 transition-opacity duration-300
          rounded-2xl
        `}></div>
      </div>
    </div>
  );

  return (
    <section className="relative py-20 overflow-hidden" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="container relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-mono mb-6 border border-white/20">
            <Brain size={16} />
            <span>Choose Your Starting Point</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            How would you like to begin?
          </h2>
          
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            Whether you're starting fresh or enhancing an existing project, 
            our AI agents will help you build faster than ever before.
          </p>
        </div>
        
        {/* Project Type Cards */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <ProjectCard
            type="new"
            icon={Rocket}
            title="Start a New Project"
            subtitle="Begin from scratch"
            description="Perfect for new ideas, prototypes, or when you want to start fresh with modern best practices."
            features={[
              "Choose from curated templates",
              "Modern tech stack recommendations", 
              "Best practices from day one",
              "Rapid MVP development"
            ]}
            gradient="from-blue-500 to-purple-600"
          />
          
          <ProjectCard
            type="existing"
            icon={FolderOpen}
            title="I Have a Project"
            subtitle="Enhance existing code"
            description="Connect your GitHub repository and let our AI analyze your codebase to suggest the perfect team."
            features={[
              "GitHub repository scanning",
              "Smart technology detection",
              "Compatible agent suggestions",
              "Incremental improvements"
            ]}
            gradient="from-green-500 to-teal-600"
          />
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-white/80 mb-4">
            Not sure? You can always change this later.
          </p>
          <div className="flex items-center justify-center gap-6 text-white/60">
            <div className="flex items-center gap-2">
              <Zap size={16} />
              <span className="text-sm">Lightning fast setup</span>
            </div>
            <div className="flex items-center gap-2">
              <Github size={16} />
              <span className="text-sm">GitHub integration</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain size={16} />
              <span className="text-sm">AI-powered analysis</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectTypeSelector;