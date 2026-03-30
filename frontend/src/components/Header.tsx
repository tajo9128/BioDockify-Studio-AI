import { Link, useLocation } from 'react-router-dom'

const menuItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/docking', label: 'Docking' },
  { path: '/viewer', label: 'Viewer' },
  { path: '/md', label: 'MD Simulation' },
  { path: '/results', label: 'Results' },
  { path: '/ai', label: 'BioDockify AI' },
]

export function Header() {
  const location = useLocation()
  
  return (
    <header className="bg-slate-800 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-cyan-400">Bio</span>
            <span className="text-xl font-bold">Dockify</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            {menuItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-slate-700 text-cyan-400'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 rounded-md hover:bg-slate-700 transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
