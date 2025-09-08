import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './components/auth/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { SignUpInvitation } from './pages/SignUpInvitation';
import { Unauthorized } from './pages/Unauthorized';
import { Dashboard } from './pages/Dashboard';
import { TestConnection } from './pages/TestConnection';
import { PWAInstallBanner, PWAStatusIndicator } from './components/pwa';
import './utils/i18n'; // Initialize i18n

// Lazy load heavy components
const Developers = lazy(() => import('./pages/Developers'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Buildings = lazy(() => import('./pages/Buildings').then(module => ({ default: module.Buildings })));
const Floors = lazy(() => import('./pages/Floors').then(module => ({ default: module.Floors })));
const Apartments = lazy(() => import('./pages/Apartments').then(module => ({ default: module.Apartments })));
const AllUnits = lazy(() => import('./pages/AllUnits').then(module => ({ default: module.AllUnits })));
const Tasks = lazy(() => import('./pages/Tasks').then(module => ({ default: module.Tasks })));
const StagesManagement = lazy(() => import('./pages/StagesManagement').then(module => ({ default: module.StagesManagement })));
const Users = lazy(() => import('./pages/Users').then(module => ({ default: module.Users })));
const Files = lazy(() => import('./pages/FilesHierarchy').then(module => ({ default: module.FilesHierarchy })));
const GlobalSearch = lazy(() => import('./pages/GlobalSearch').then(module => ({ default: module.GlobalSearch })));
const ProjectApartments = lazy(() => import('./pages/ProjectApartments').then(module => ({ default: module.ProjectApartments })));
const ProjectFloors = lazy(() => import('./pages/ProjectFloors').then(module => ({ default: module.ProjectFloors })));

// Fast loading component
const AppLoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('מערכת ניהול נדל״ן טוענת...');
  
  useEffect(() => {
    const messages = [
      'מערכת ניהול נדל״ן טוענת...',
      'מחבר למסד נתונים...',
      'טוען הגדרות...',
      'כמעט מוכן...'
    ];
    
    let currentMessage = 0;
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      currentProgress += 25;
      setProgress(currentProgress);
      
      if (currentMessage < messages.length - 1) {
        setMessage(messages[currentMessage]);
        currentMessage++;
      }
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        // If we reach 100% and still loading, show that we're ready to continue
        setTimeout(() => {
          setMessage('לחץ על כניסה למערכת');
        }, 500);
      }
    }, 800);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="text-center max-w-md w-full px-4">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
        <p className="mt-4 text-gray-600 text-lg">{message}</p>
        <div className="mt-4 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="mt-2 text-sm text-gray-500">{progress}%</p>
        
        {progress >= 100 && (
          <div className="mt-6">
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              כניסה למערכת
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Page loading component for lazy loaded pages
const PageLoadingScreen = () => (
  <div className="p-6 flex items-center justify-center min-h-[400px]" dir="rtl">
    <div className="text-center">
      <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      <p className="mt-2 text-gray-600">טוען דף...</p>
    </div>
  </div>
);

// Import Settings page
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));

function App() {
  
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup-invitation" element={<SignUpInvitation />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute fallback={<AppLoadingScreen />}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="test-connection" element={<TestConnection />} />
            
            {/* Admin/Developer only routes */}
            <Route path="developers" element={
              <ProtectedRoute resource="developers">
                <Suspense fallback={<PageLoadingScreen />}>
                  <Developers />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Project-based routes */}
            <Route path="projects" element={
              <ProtectedRoute resource="projects">
                <Suspense fallback={<PageLoadingScreen />}>
                  <Projects />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="projects/:projectId" element={
              <ProtectedRoute resource="projects">
                <Suspense fallback={<PageLoadingScreen />}>
                  <ProjectDetails />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="projects/:projectId/apartments" element={
              <ProtectedRoute resource="apartments">
                <Suspense fallback={<PageLoadingScreen />}>
                  <ProjectApartments />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="projects/:projectId/floors" element={
              <ProtectedRoute resource="floors">
                <Suspense fallback={<PageLoadingScreen />}>
                  <ProjectFloors />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="projects/:projectId/buildings" element={
              <ProtectedRoute resource="buildings">
                <Suspense fallback={<PageLoadingScreen />}>
                  <Buildings />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="projects/:projectId/buildings/:buildingId/floors" element={
              <ProtectedRoute resource="floors">
                <Suspense fallback={<PageLoadingScreen />}>
                  <Floors />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="projects/:projectId/buildings/:buildingId/floors/:floorId/apartments" element={
              <ProtectedRoute resource="apartments">
                <Suspense fallback={<PageLoadingScreen />}>
                  <Apartments />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Other routes */}
            <Route path="units" element={
              <Suspense fallback={<PageLoadingScreen />}>
                <AllUnits />
              </Suspense>
            } />
            <Route path="tasks" element={
              <Suspense fallback={<PageLoadingScreen />}>
                <Tasks />
              </Suspense>
            } />
            <Route path="tasks/stages" element={
              <Suspense fallback={<PageLoadingScreen />}>
                <StagesManagement />
              </Suspense>
            } />
            <Route path="files" element={
              <ProtectedRoute resource="files">
                <Suspense fallback={<PageLoadingScreen />}>
                  <Files />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="search" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoadingScreen />}>
                  <GlobalSearch />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute resource="users">
                <Suspense fallback={<PageLoadingScreen />}>
                  <Users />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <Suspense fallback={<PageLoadingScreen />}>
                <Settings />
              </Suspense>
            } />
          </Route>
        </Routes>
        <Toaster
          position="top-left"
          toastOptions={{
            duration: 3000,
            style: {
              direction: 'rtl',
              fontFamily: 'inherit',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
        
        {/* PWA Components */}
        <PWAInstallBanner />
        <PWAStatusIndicator />
      </AuthProvider>
    </Router>
  );
}


export default App;
