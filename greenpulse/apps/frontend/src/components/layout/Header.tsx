import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects':  'Projets',
  '/audits':    'Audits',
  '/reports':   'Rapports',
  '/settings':  'Paramètres',
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  const match = Object.entries(routeTitles).find(([path]) =>
    pathname.startsWith(path)
  );
  return match ? match[1] : '';
}

export function Header() {
  const title = usePageTitle();

  return (
    <header className="h-11 bg-gray-950 border-b border-gray-800/50 flex items-center px-6 shrink-0">
      <span className="text-sm text-gray-500 flex-1">{title}</span>
      <button className="p-1.5 rounded text-gray-600 hover:text-gray-400 transition-colors">
        <Bell size={15} />
      </button>
    </header>
  );
}
