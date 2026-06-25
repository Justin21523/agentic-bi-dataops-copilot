import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Code2, Clock, ShieldCheck,
  Database, Activity, ChevronRight, Workflow,
  Users, Package, Filter, ShieldAlert, Sparkles, Upload, TrendingUp,
} from 'lucide-react'
import { useLang } from '../context/LangContext'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useLang()

  const NAV = [
    { to: '/upload',     icon: Upload,          key: 'nav.upload' },
    { to: '/',           icon: LayoutDashboard, key: 'nav.dashboard' },
    { to: '/workflow',   icon: Workflow,        key: 'nav.workflow' },
    { to: '/query',      icon: MessageSquare,   key: 'nav.nlQuery' },
    { to: '/playground', icon: Code2,           key: 'nav.sqlPlayground' },
    { to: '/history',    icon: Clock,           key: 'nav.queryHistory' },
    { to: '/dq',         icon: ShieldCheck,     key: 'nav.dataQuality' },
    { to: '/schema',     icon: Database,        key: 'nav.schemaExplorer' },
  ]

  const NAV_ANALYTICS = [
    { to: '/customers',  icon: Users,        key: 'nav.customers' },
    { to: '/products',   icon: Package,      key: 'nav.products' },
    { to: '/funnel',     icon: Filter,       key: 'nav.funnel' },
    { to: '/revenue',    icon: TrendingUp,   key: 'nav.revenue' },
    { to: '/guardrails', icon: ShieldAlert,  key: 'nav.guardrails' },
    { to: '/insights',   icon: Sparkles,     key: 'nav.insights' },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">BI Copilot</p>
              <p className="text-slate-500 text-[10px] mt-0.5">DataOps · Text2SQL</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          <div className="space-y-0.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 px-3 mb-1">{t('nav.core')}</p>
            {NAV.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{t(key)}</span>
              </NavLink>
            ))}
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 px-3 mb-1">{t('nav.analytics')}</p>
            {NAV_ANALYTICS.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{t(key)}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700/50">
          <p className="text-slate-600 text-[10px]">v0.1.0 · DuckDB Warehouse</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center px-6 gap-2 flex-shrink-0">
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <h1 className="text-sm font-medium text-slate-600 flex-1">{t('app.title')}</h1>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            {t('lang.toggle')}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
