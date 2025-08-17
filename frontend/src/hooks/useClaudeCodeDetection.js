import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const useClaudeCodeDetection = (autoDetect = false) => {
  const { getToken } = useAuth();
  const [detection, setDetection] = useState({
    status: 'idle', // 'idle' | 'checking' | 'found' | 'not-found' | 'error'
    hasClaudeCode: null,
    version: null,
    detectionMethod: null,
    error: null,
    additionalInfo: null,
    isLoading: false
  });

  // Method 1: Browser-based detection
  const detectViaBrowser = useCallback(async () => {
    try {
      // Check if Claude Code is running locally by testing common ports
      const possiblePorts = [3001, 3000, 8080, 8000];
      const endpoints = ['/api/health', '/health', '/version', '/api/version'];
      
      for (const port of possiblePorts) {
        for (const endpoint of endpoints) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
            
            const response = await fetch(`http://localhost:${port}${endpoint}`, {
              method: 'GET',
              signal: controller.signal,
              mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const contentType = response.headers.get('content-type');
              let data = {};
              
              try {
                if (contentType && contentType.includes('application/json')) {
                  data = await response.json();
                }
              } catch (e) {
                // Not JSON, that's fine
              }
              
              const responseText = await response.text();
              
              // Check if response indicates Claude Code
              if (responseText.toLowerCase().includes('claude') || 
                  responseText.toLowerCase().includes('anthropic') ||
                  data.name?.toLowerCase().includes('claude')) {
                
                return {
                  found: true,
                  method: 'browser',
                  port,
                  endpoint,
                  version: data.version || extractVersionFromText(responseText),
                  responseData: data
                };
              }
            }
          } catch (error) {
            // Network error, CORS error, or timeout - continue to next
            if (error.name === 'AbortError') {
              console.log(`Timeout checking localhost:${port}${endpoint}`);
            }
            continue;
          }
        }
      }
      
      return { found: false, method: 'browser' };
    } catch (error) {
      console.error('Browser detection error:', error);
      return { found: false, method: 'browser', error: error.message };
    }
  }, []);

  // Method 2: API-based detection (uses backend)
  const detectViaAPI = useCallback(async () => {
    try {
      const token = await getToken();
      
      const response = await fetch('/api/v1/onboarding/detect-claude-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          check_method: 'both' // Check both API and command line
        })
      });
      
      if (!response.ok) {
        throw new Error(`API detection failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        found: result.has_claude_code,
        method: 'api',
        version: result.version,
        detectionMethod: result.detection_method,
        additionalInfo: result.additional_info,
        error: result.error_message
      };
    } catch (error) {
      console.error('API detection error:', error);
      return { found: false, method: 'api', error: error.message };
    }
  }, [getToken]);

  // Combined detection method
  const detectClaudeCode = useCallback(async (method = 'auto') => {
    setDetection(prev => ({ ...prev, isLoading: true, status: 'checking', error: null }));
    
    try {
      let result = { found: false };
      
      if (method === 'browser' || method === 'auto') {
        result = await detectViaBrowser();
        if (result.found) {
          setDetection({
            status: 'found',
            hasClaudeCode: true,
            version: result.version,
            detectionMethod: result.method,
            error: null,
            additionalInfo: result,
            isLoading: false
          });
          return result;
        }
      }
      
      if (method === 'api' || method === 'auto') {
        result = await detectViaAPI();
        if (result.found) {
          setDetection({
            status: 'found',
            hasClaudeCode: true,
            version: result.version,
            detectionMethod: result.detectionMethod || result.method,
            error: result.error,
            additionalInfo: result.additionalInfo || result,
            isLoading: false
          });
          return result;
        }
      }
      
      // Not found
      setDetection({
        status: 'not-found',
        hasClaudeCode: false,
        version: null,
        detectionMethod: null,
        error: result.error,
        additionalInfo: result.additionalInfo || result,
        isLoading: false
      });
      
      return result;
      
    } catch (error) {
      console.error('Claude Code detection failed:', error);
      setDetection({
        status: 'error',
        hasClaudeCode: null,
        version: null,
        detectionMethod: null,
        error: error.message,
        additionalInfo: null,
        isLoading: false
      });
      
      return { found: false, error: error.message };
    }
  }, [detectViaBrowser, detectViaAPI]);

  // Auto-detect on mount if requested
  useEffect(() => {
    if (autoDetect) {
      detectClaudeCode('auto');
    }
  }, [autoDetect, detectClaudeCode]);

  // Manual refresh detection
  const refreshDetection = useCallback(() => {
    return detectClaudeCode('auto');
  }, [detectClaudeCode]);

  // Reset detection state
  const resetDetection = useCallback(() => {
    setDetection({
      status: 'idle',
      hasClaudeCode: null,
      version: null,
      detectionMethod: null,
      error: null,
      additionalInfo: null,
      isLoading: false
    });
  }, []);

  // Get installation instructions based on detection results
  const getInstallationInstructions = useCallback(() => {
    const baseInstructions = [
      {
        step: 1,
        title: "Visit Claude Code",
        description: "Go to https://claude.ai/code to access Claude Code",
        action: "Visit Website"
      },
      {
        step: 2,
        title: "Install Claude Code",
        description: "Follow the installation instructions for your operating system",
        action: "Install"
      },
      {
        step: 3,
        title: "Verify Installation",
        description: "Open a terminal and run 'claude-code --version' to verify installation",
        action: "Verify"
      }
    ];

    // Add platform-specific instructions based on detected environment
    const userAgent = navigator.userAgent.toLowerCase();
    let platformInstructions = [];

    if (userAgent.includes('mac')) {
      platformInstructions = [
        "Install via Homebrew: 'brew install claude-code'",
        "Or download the macOS installer from the website",
        "Make sure Claude Code is in your PATH"
      ];
    } else if (userAgent.includes('win')) {
      platformInstructions = [
        "Download the Windows installer from the website",
        "Run the installer as administrator",
        "Restart your command prompt after installation"
      ];
    } else if (userAgent.includes('linux')) {
      platformInstructions = [
        "Download the Linux package from the website",
        "Install using your package manager",
        "Add Claude Code to your PATH if needed"
      ];
    }

    return {
      general: baseInstructions,
      platform: platformInstructions,
      troubleshooting: [
        "Restart your terminal after installation",
        "Check that Claude Code is in your system PATH",
        "Try running 'npx claude-code --version' if direct command fails",
        "Ensure you have the latest version of Node.js installed"
      ]
    };
  }, []);

  return {
    // State
    ...detection,
    
    // Actions
    detectClaudeCode,
    refreshDetection,
    resetDetection,
    
    // Utilities
    getInstallationInstructions,
    
    // Computed properties
    canProceed: detection.status !== 'checking' && detection.status !== 'idle',
    needsInstallation: detection.status === 'not-found',
    hasError: detection.status === 'error',
    isDetected: detection.status === 'found' && detection.hasClaudeCode === true
  };
};

// Helper function to extract version from text
function extractVersionFromText(text) {
  const versionPatterns = [
    /claude-code@([\d\.]+)/i,
    /version\s+([\d\.]+)/i,
    /v([\d\.]+)/i,
    /([\d]+\.[\d]+\.[\d]+)/
  ];
  
  for (const pattern of versionPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

export default useClaudeCodeDetection;