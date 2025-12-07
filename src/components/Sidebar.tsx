/**
 * Sidebar navigation component
 */

export type ViewType = 'welcome' | 'schedule' | 'leaders' | 'groups' | 'rules' | 'export';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  hasFile: boolean;
  assignmentCount: number;
  editedCount: number;
}

interface NavItem {
  id: ViewType;
  icon: string;
  label: string;
  requiresFile: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'schedule', icon: '📋', label: 'Schedule', requiresFile: true },
  { id: 'leaders', icon: '👥', label: 'Leaders', requiresFile: true },
  { id: 'groups', icon: '🏷️', label: 'Groups', requiresFile: true },
  { id: 'rules', icon: '📅', label: 'Rules', requiresFile: true },
  { id: 'export', icon: '📤', label: 'Export', requiresFile: true },
];

export function Sidebar({
  currentView,
  onNavigate,
  hasFile,
  assignmentCount,
  editedCount,
}: SidebarProps) {
  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''} ${!hasFile && item.requiresFile ? 'disabled' : ''}`}
            onClick={() => onNavigate(item.id)}
            disabled={!hasFile && item.requiresFile}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.id === 'schedule' && assignmentCount > 0 && (
              <span className="nav-badge">{assignmentCount}</span>
            )}
          </button>
        ))}
      </nav>
      
      {hasFile && (
        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-value">{assignmentCount}</span>
            <span className="stat-label">Events</span>
          </div>
          {editedCount > 0 && (
            <div className="stat-item edited">
              <span className="stat-value">{editedCount}</span>
              <span className="stat-label">Edited</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
