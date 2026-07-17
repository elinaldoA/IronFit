import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="shell__main">
        <Topbar onMenuClick={() => setMenuOpen(true)} />
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
