import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/mobile.css'

// Simple error boundary component
import React from 'react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('💥 Error boundary caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('💥 App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">שגיאה באפליקציה</h1>
            <p className="text-gray-600 mb-4">אירעה שגיאה בלתי צפויה. אנא רענן את הדף.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              רענן דף
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main bootstrap function
async function bootstrapApp() {
  // Try to import App with error handling
  let App;
  try {
    App = (await import('./App.tsx')).default;
  } catch (error) {
    console.error('💥 Failed to import App:', error);
    
    // Fallback simple app
    App = () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">💥</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">שגיאה בטעינת האפליקציה</h1>
          <p className="text-gray-600 mb-4">לא הצלחנו לטעון את קבצי האפליקציה</p>
          <p className="text-sm text-gray-500">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </div>
    );
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('💥 Root element not found!');
    throw new Error('Root element not found');
  }

  const root = createRoot(rootElement);

  try {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error('💥 Render failed:', error);
  }
}

// Start the app
bootstrapApp().catch(error => {
  console.error('💥 Bootstrap failed:', error);
});
