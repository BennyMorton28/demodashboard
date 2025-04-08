"use client";

import React, { useEffect } from 'react';
import DebugOverlay, { logDebug } from './debug-overlay';

export default function ClientDebugProvider() {
  useEffect(() => {
    // Log initial system info
    logDebug('Debug overlay initialized', {
      userAgent: navigator.userAgent,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    
    // Listen for navigation events
    const handleRouteChange = () => {
      logDebug('Navigation occurred', { 
        url: window.location.href,
        pathname: window.location.pathname
      });
      
      // Check if we're on a demo page and log info
      const match = window.location.pathname.match(/\/demos\/([^\/]+)/);
      if (match && match[1]) {
        const demoId = match[1];
        logDebug('Demo page loaded', { demoId }, 'info');
        checkDemoAvailability(demoId);
      }
    };
    
    // Check demo availability
    async function checkDemoAvailability(demoId: string) {
      try {
        logDebug('Checking demo availability', { demoId }, 'info');
        const response = await fetch(`/api/check-demo-creation?id=${demoId}`);
        
        if (response.ok) {
          const data = await response.json();
          logDebug('Demo availability check result', data, data.success ? 'success' : 'error');
          
          if (!data.success) {
            // Log missing files
            const missingFiles = Object.entries(data.details || {})
              .filter(([_, details]: [string, any]) => !details.exists)
              .map(([key]: [string, any]) => key);
            
            logDebug('Missing demo files', { missingFiles }, 'warning');
          }
        } else {
          logDebug('Demo check API error', { 
            status: response.status, 
            statusText: response.statusText 
          }, 'error');
        }
      } catch (error) {
        logDebug('Error checking demo availability', error, 'error');
      }
    }
    
    // Add event listeners
    window.addEventListener('popstate', handleRouteChange);
    
    // Log initial route
    handleRouteChange();
    
    // Set up error logging
    const originalConsoleError = console.error;
    console.error = (...args) => {
      logDebug('Console error', { args: [...args] }, 'error');
      originalConsoleError(...args);
    };
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      console.error = originalConsoleError;
    };
  }, []);
  
  return <DebugOverlay />;
} 