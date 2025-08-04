import React from 'react';

const WorkflowIllustration = () => {
  return (
    <div className="relative w-full max-w-2xl mx-auto mt-8 mb-8 fade-in-up animation-delay-800">
      <svg
        viewBox="0 0 800 300"
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.05))' }}
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.7)" />
          </linearGradient>
          <filter id="blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>

        {/* Connection lines */}
        <path
          d="M 200 150 Q 300 150 400 150"
          stroke="rgba(118, 133, 151, 0.3)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          className="animate-pulse"
        />
        <path
          d="M 400 150 Q 500 150 600 150"
          stroke="rgba(118, 133, 151, 0.3)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          className="animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />

        {/* Agent Cards */}
        <g className="float-animation">
          <rect
            x="100"
            y="100"
            width="200"
            height="100"
            rx="12"
            fill="url(#cardGradient)"
            stroke="rgba(152, 125, 156, 0.2)"
            strokeWidth="1"
          />
          <text
            x="200"
            y="140"
            textAnchor="middle"
            className="font-mono"
            fontSize="14"
            fill="#987D9C"
          >
            UI Designer 🎨
          </text>
          <text
            x="200"
            y="165"
            textAnchor="middle"
            fontSize="12"
            fill="#666"
            opacity="0.7"
          >
            Creating interfaces
          </text>
        </g>

        <g className="float-animation-delayed">
          <rect
            x="300"
            y="100"
            width="200"
            height="100"
            rx="12"
            fill="url(#cardGradient)"
            stroke="rgba(118, 133, 151, 0.2)"
            strokeWidth="1"
          />
          <text
            x="400"
            y="140"
            textAnchor="middle"
            className="font-mono"
            fontSize="14"
            fill="#768597"
          >
            Backend Dev 🛠️
          </text>
          <text
            x="400"
            y="165"
            textAnchor="middle"
            fontSize="12"
            fill="#666"
            opacity="0.7"
          >
            Building APIs
          </text>
        </g>

        <g className="float-animation">
          <rect
            x="500"
            y="100"
            width="200"
            height="100"
            rx="12"
            fill="url(#cardGradient)"
            stroke="rgba(188, 161, 130, 0.2)"
            strokeWidth="1"
          />
          <text
            x="600"
            y="140"
            textAnchor="middle"
            className="font-mono"
            fontSize="14"
            fill="#BCA182"
          >
            DevOps 🚀
          </text>
          <text
            x="600"
            y="165"
            textAnchor="middle"
            fontSize="12"
            fill="#666"
            opacity="0.7"
          >
            Deploying to cloud
          </text>
        </g>

        {/* Progress indicators */}
        <circle cx="200" cy="220" r="4" fill="#4ade80" className="animate-pulse" />
        <circle cx="400" cy="220" r="4" fill="#4ade80" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
        <circle cx="600" cy="220" r="4" fill="#4ade80" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
      </svg>
      
      {/* Decorative blur elements */}
      <div 
        className="absolute -top-4 -left-4 w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(152, 125, 156, 0.1) 0%, transparent 70%)',
          filter: 'blur(20px)'
        }}
      />
      <div 
        className="absolute -bottom-4 -right-4 w-40 h-40 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(118, 133, 151, 0.1) 0%, transparent 70%)',
          filter: 'blur(30px)'
        }}
      />
    </div>
  );
};

export default WorkflowIllustration;