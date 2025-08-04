import React, { useState } from 'react';
import { X, FolderOpen, User, ChevronRight } from 'lucide-react';

const ExportLocationModal = ({ isOpen, onClose, onSelectLocation }) => {
  const [hoveredOption, setHoveredOption] = useState(null);

  const handleSelect = (location) => {
    onClose();
    // Delay to let modal close animation complete
    setTimeout(() => {
      onSelectLocation(location);
    }, 300);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
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
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
        >
          <X size={16} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={28} className="text-blue-600" />
            </div>
            <h2 className="heading-2 mb-3">Create new agent</h2>
            <p className="body-medium opacity-80">
              Step 1: Choose location
            </p>
          </div>

          {/* Location Options */}
          <div className="space-y-3">
            {/* Project Option */}
            <button
              onClick={() => handleSelect('project')}
              onMouseEnter={() => setHoveredOption('project')}
              onMouseLeave={() => setHoveredOption(null)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                hoveredOption === 'project' 
                  ? 'border-blue-400 bg-blue-50 shadow-md transform scale-[1.02]' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    hoveredOption === 'project' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-600">
                      1. Project (.claude/agents/)
                    </div>
                    <div className="text-sm opacity-70 mt-0.5">
                      Available in current project
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className={`opacity-50 transition-transform ${
                  hoveredOption === 'project' ? 'translate-x-1' : ''
                }`} />
              </div>
            </button>

            {/* Personal Option */}
            <button
              onClick={() => handleSelect('personal')}
              onMouseEnter={() => setHoveredOption('personal')}
              onMouseLeave={() => setHoveredOption(null)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                hoveredOption === 'personal' 
                  ? 'border-purple-400 bg-purple-50 shadow-md transform scale-[1.02]' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    hoveredOption === 'personal' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    <User size={20} />
                  </div>
                  <div>
                    <div className="font-semibold">
                      2. Personal (~/.claude/agents/)
                    </div>
                    <div className="text-sm opacity-70 mt-0.5">
                      Available across all projects
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className={`opacity-50 transition-transform ${
                  hoveredOption === 'personal' ? 'translate-x-1' : ''
                }`} />
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-blue-500">ℹ️</span>
              <div>
                <strong>Project agents</strong> are specific to your current project and can be shared with your team.
                <br />
                <strong>Personal agents</strong> are available in all your projects but only for you.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportLocationModal;