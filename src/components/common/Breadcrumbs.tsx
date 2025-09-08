import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Home, Building, Layers, Users, CheckSquare, FileText, Search, Settings } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  clickable?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ 
  items, 
  showHome = true 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-generate breadcrumbs based on current path if no items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    if (showHome) {
      breadcrumbs.push({
        label: 'דשבורד',
        path: '/',
        icon: Home,
        clickable: true
      });
    }

    // Handle different route patterns
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const path = '/' + pathSegments.slice(0, i + 1).join('/');

      switch (segment) {
        case 'projects':
          if (pathSegments[i + 1]) {
            // We're in a specific project
            breadcrumbs.push({
              label: 'פרויקטים',
              path: '/projects',
              icon: Building,
              clickable: true
            });
          } else {
            // We're in projects list
            breadcrumbs.push({
              label: 'פרויקטים',
              path: '/projects',
              icon: Building,
              clickable: false
            });
          }
          break;

        case 'units':
          breadcrumbs.push({
            label: 'כל הדירות',
            path: '/units',
            icon: Home,
            clickable: false
          });
          break;

        case 'tasks':
          if (pathSegments[i + 1] === 'stages') {
            breadcrumbs.push({
              label: 'משימות',
              path: '/tasks',
              icon: CheckSquare,
              clickable: true
            });
          } else {
            breadcrumbs.push({
              label: 'משימות',
              path: '/tasks',
              icon: CheckSquare,
              clickable: false
            });
          }
          break;

        case 'stages':
          if (pathSegments[i - 1] === 'tasks') {
            breadcrumbs.push({
              label: 'ניהול שלבים',
              path: '/tasks/stages',
              icon: CheckSquare,
              clickable: false
            });
          }
          break;

        case 'files':
          breadcrumbs.push({
            label: 'קבצים',
            path: '/files',
            icon: FileText,
            clickable: false
          });
          break;

        case 'search':
          breadcrumbs.push({
            label: 'חיפוש',
            path: '/search',
            icon: Search,
            clickable: false
          });
          break;

        case 'settings':
          breadcrumbs.push({
            label: 'הגדרות',
            path: '/settings',
            icon: Settings,
            clickable: false
          });
          break;

        case 'apartments':
          if (pathSegments[i - 1] === 'projects' && pathSegments[i - 2]) {
            // /projects/:id/apartments
            breadcrumbs.push({
              label: 'כל הדירות',
              path: path,
              icon: Home,
              clickable: false
            });
          }
          break;

        case 'floors':
          if (pathSegments[i - 1] === 'projects' && pathSegments[i - 2]) {
            // /projects/:id/floors
            breadcrumbs.push({
              label: 'כל הקומות',
              path: path,
              icon: Layers,
              clickable: false
            });
          }
          break;

        case 'buildings':
          if (pathSegments[i - 1] === 'projects' && pathSegments[i - 2]) {
            // /projects/:id/buildings
            breadcrumbs.push({
              label: 'בניינים',
              path: path,
              icon: Building,
              clickable: false
            });
          }
          break;

        default:
          // Handle project IDs and other dynamic segments
          if (pathSegments[i - 1] === 'projects' && segment.match(/^[a-f0-9-]+$/)) {
            // This is a project ID
            breadcrumbs.push({
              label: 'פרטי פרויקט',
              path: path,
              icon: Building,
              clickable: false
            });
          }
          break;
      }
    }

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4" dir="rtl">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && (
            <ArrowRight className="h-4 w-4 text-gray-400" />
          )}
          
          {item.clickable ? (
            <button
              onClick={() => navigate(item.path)}
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-gray-900 font-medium">
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
