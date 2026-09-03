import { NavLink } from 'react-router-dom'

const linkBase =
  'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150'

const linkActive = 'bg-slate-900 text-white'
const linkInactive = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm">
            PF
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 leading-tight">
              Portfolio Lab
            </div>
            <div className="text-xs text-slate-500">Análisis & Educación</div>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Inicio
          </NavLink>

          <NavLink
            to="/analisis"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Análisis
          </NavLink>

          <NavLink
            to="/convertidor"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Convertidor
          </NavLink>
        </nav>
      </div>
    </header>
  )
}