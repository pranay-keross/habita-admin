import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/users', label: 'Users', end: false },
  { to: '/categories', label: 'Feature usage', end: false },
  { to: '/ai-usage', label: 'AI consumption', end: false },
  { to: '/campaigns', label: 'Push campaigns', end: false },
  { to: '/banners', label: 'Banners', end: false },
  { to: '/challenges', label: 'Challenges', end: false },
];

export default function Layout() {
  const { admin, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>H</span>
          <div>
            <div className="brand-name">Habita AI</div>
            <div className="brand-sub">Admin</div>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="admin-name">{admin?.name}</div>
          <div className="admin-email">{admin?.email}</div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
