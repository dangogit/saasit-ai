import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Terminal, 
  Download, 
  ExternalLink,
  AlertCircle,
  Zap,
  Monitor,
  Command,
  Info
} from 'lucide-react';

import useClaudeCodeDetection from '../../hooks/useClaudeCodeDetection';
import useOnboardingStore from '../../stores/onboardingStore';

const ClaudeCodeDetector = ({ onComplete, onSkip }) => {
  const { setClaudeCodeStatus, setUserExperience } = useOnboardingStore();
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [detectionMethod, setDetectionMethod] = useState('auto');
  const [manualVersionInput, setManualVersionInput] = useState('');
  
  const {
    status,
    hasClaudeCode,
    version,
    detectionMethod: detectedMethod,
    error,
    additionalInfo,
    isLoading,
    detectClaudeCode,
    refreshDetection,
    getInstallationInstructions,
    canProceed,
    needsInstallation,
    hasError,
    isDetected
  } = useClaudeCodeDetection(true); // Auto-detect on mount

  // Update onboarding store when detection status changes
  useEffect(() => {
    setClaudeCodeStatus(status, version);
  }, [status, version, setClaudeCodeStatus]);

  const handleManualEntry = () => {
    if (manualVersionInput.trim()) {
      setClaudeCodeStatus('found', manualVersionInput.trim());
      onComplete?.();
    }
  };

  const handleSkipDetection = () => {
    setClaudeCodeStatus('not-found', null);
    onSkip?.('manual-skip');
  };

  const installInstructions = getInstallationInstructions();

  const renderDetectionStatus = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Detecting Claude Code...</h3>
            <p className="text-white/70">
              Checking your system for Claude Code installation
            </p>
            <div className="mt-4 text-sm text-white/50">
              Testing method: {detectionMethod}
            </div>
          </div>
        );

      case 'found':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Claude Code Detected! ✅</h3>
            <p className="text-white/70 mb-4">
              Found Claude Code {version && `version ${version}`} via {detectedMethod} detection
            </p>
            
            <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-400/30 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Zap size={20} className="text-green-300" />
                <span className="font-medium text-green-100">Ready to go!</span>
              </div>
              <p className="text-green-200/80 text-sm">
                Your Claude Code installation is working properly. You can create workflows and execute them locally.
              </p>
            </div>

            {additionalInfo && (
              <details className="text-left">
                <summary className="text-white/60 text-sm cursor-pointer hover:text-white/80 transition-colors">
                  Detection details
                </summary>
                <div className="mt-2 p-3 bg-white/10 rounded-lg text-xs text-white/70 font-mono">
                  <pre>{JSON.stringify(additionalInfo, null, 2)}</pre>
                </div>
              </details>
            )}
          </div>
        );

      case 'not-found':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} className="text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Claude Code Not Found</h3>
            <p className="text-white/70 mb-6">
              We couldn't detect Claude Code on your system. Don't worry - we can help you install it!
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setShowInstallInstructions(true)}
                className="p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-xl transition-all duration-300 hover:scale-105"
              >
                <Download size={24} className="text-blue-300 mx-auto mb-2" />
                <div className="text-white font-medium">Install Claude Code</div>
                <div className="text-white/60 text-sm">Get installation guide</div>
              </button>

              <button
                onClick={() => setDetectionMethod('manual')}
                className="p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded-xl transition-all duration-300 hover:scale-105"
              >
                <Terminal size={24} className="text-purple-300 mx-auto mb-2" />
                <div className="text-white font-medium">Manual Entry</div>
                <div className="text-white/60 text-sm">Enter version manually</div>
              </button>
            </div>

            <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30">
              <div className="flex items-center gap-3 mb-2">
                <Info size={16} className="text-blue-300" />
                <span className="font-medium text-blue-100">You can still continue</span>
              </div>
              <p className="text-blue-200/80 text-sm">
                Claude Code isn't required to design workflows. You can skip this step and install it later.
              </p>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Detection Error</h3>
            <p className="text-white/70 mb-4">
              We encountered an error while checking for Claude Code
            </p>
            
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-4 border border-red-400/30 mb-6">
                <div className="text-red-200 text-sm font-mono">
                  {error}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => refreshDetection()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={() => setDetectionMethod('manual')}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                Manual Entry
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Monitor size={32} className="text-white/60" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Ready to Detect</h3>
            <p className="text-white/70 mb-6">
              Click below to check if Claude Code is installed on your system
            </p>
            
            <button
              onClick={() => detectClaudeCode('auto')}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <Zap size={20} />
              Start Detection
            </button>
          </div>
        );
    }
  };

  const renderManualEntry = () => (
    <div className="max-w-md mx-auto text-center">
      <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Terminal size={32} className="text-purple-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-4">Manual Entry</h3>
      <p className="text-white/70 mb-6">
        If you have Claude Code installed but we couldn't detect it, enter your version manually
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Claude Code Version</label>
          <input
            type="text"
            value={manualVersionInput}
            onChange={(e) => setManualVersionInput(e.target.value)}
            placeholder="e.g., 1.0.0"
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-white/50"
          />
        </div>

        <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/30">
          <div className="flex items-center gap-2 mb-2">
            <Command size={16} className="text-yellow-300" />
            <span className="text-yellow-100 text-sm font-medium">Quick Check</span>
          </div>
          <p className="text-yellow-200/80 text-xs">
            Run <code className="bg-black/30 px-1 rounded">claude-code --version</code> in your terminal to find your version
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setDetectionMethod('auto')}
          className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleManualEntry}
          disabled={!manualVersionInput.trim()}
          className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );

  const renderInstallInstructions = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Download size={32} className="text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-4">Install Claude Code</h3>
        <p className="text-white/70">
          Follow these steps to install Claude Code on your system
        </p>
      </div>

      <div className="space-y-6">
        {/* General Instructions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ExternalLink size={18} />
            Installation Steps
          </h4>
          <div className="space-y-3">
            {installInstructions.general.map((instruction, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-200 text-sm font-medium">{instruction.step}</span>
                </div>
                <div>
                  <div className="text-white font-medium">{instruction.title}</div>
                  <div className="text-white/70 text-sm">{instruction.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform-specific instructions */}
        {installInstructions.platform.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h4 className="font-semibold text-white mb-4">Platform-Specific Instructions</h4>
            <div className="space-y-2">
              {installInstructions.platform.map((instruction, index) => (
                <div key={index} className="text-white/80 text-sm flex items-start gap-2">
                  <span className="text-blue-300 mt-1">•</span>
                  <code className="bg-black/30 px-2 py-1 rounded text-xs flex-1">{instruction}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troubleshooting */}
        <details className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <summary className="p-6 cursor-pointer text-white font-medium hover:text-white/80 transition-colors">
            Troubleshooting
          </summary>
          <div className="px-6 pb-6">
            <div className="space-y-2">
              {installInstructions.troubleshooting.map((tip, index) => (
                <div key={index} className="text-white/70 text-sm flex items-start gap-2">
                  <span className="text-orange-300 mt-1">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={() => setShowInstallInstructions(false)}
          className="flex-1 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => {
            setShowInstallInstructions(false);
            refreshDetection();
          }}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 justify-center"
        >
          <RefreshCw size={16} />
          Check Again
        </button>
      </div>
    </div>
  );

  // Main render logic
  if (showInstallInstructions) {
    return renderInstallInstructions();
  }

  if (detectionMethod === 'manual') {
    return renderManualEntry();
  }

  return (
    <div className="max-w-2xl mx-auto">
      {renderDetectionStatus()}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        {canProceed && (
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <CheckCircle size={20} />
            Continue
          </button>
        )}

        <button
          onClick={handleSkipDetection}
          className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Skip for Now
        </button>

        {(hasError || needsInstallation) && (
          <button
            onClick={() => refreshDetection()}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Checking...' : 'Try Again'}
          </button>
        )}
      </div>

      {/* Detection Methods */}
      <div className="mt-8 text-center">
        <details className="text-left">
          <summary className="text-white/60 text-sm cursor-pointer hover:text-white/80 transition-colors">
            Detection methods
          </summary>
          <div className="mt-2 space-y-2 text-xs text-white/70">
            <div>• Browser: Check localhost ports for Claude Code server</div>
            <div>• API: Server-side command line detection</div>
            <div>• Manual: User enters version information</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ClaudeCodeDetector;