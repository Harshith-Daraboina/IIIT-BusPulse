'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BusFront,
  Radio,
  Route,
  History,
  Bell,
  ShieldCheck,
  ArrowUpRight,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  GraduationCap,
  LogOut,
  HelpCircle,
  MapPin,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
const links = [
  { href: '/', label: 'Live tracking', icon: Radio },
  { href: '/routes', label: 'Bus routes', icon: Route },
  { href: '/history', label: 'Trip history', icon: History },
  { href: '/alerts', label: 'Arrival alerts', icon: Bell },
];
export function Shell({
  children,
  title,
  demo = false,
  notificationCount = 0,
}: {
  children: React.ReactNode;
  title: string;
  demo?: boolean;
  notificationCount?: number;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const enabled = localStorage.getItem('campusride-theme') === 'dark';
    setDark(enabled);
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
  }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('campusride-theme', next ? 'dark' : 'light');
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
  }
  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <BusFront size={25} strokeWidth={2.2} />
          </span>
          <span>
            IIIT <span className="brand-light">BusPulse</span>
            <small>IIIT DHARWAD TRANSPORT</small>
          </span>
        </Link>
        <button className="campus-select" onClick={() => setHelp(true)}>
          <span className="campus-icon">
            <GraduationCap size={20} />
          </span>
          <span>
            IIIT Dharwad<small>Ittigatti campus</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <p className="nav-caption">WORKSPACE</p>
        <nav>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`nav-item ${pathname === href ? 'active' : ''}`}
            >
              <Icon size={19} />
              {label}
              {href === '/' && <span className="nav-live-dot" />}
              {href === '/alerts' && notificationCount > 0 && (
                <span className="nav-count">{notificationCount}</span>
              )}
            </Link>
          ))}
        </nav>
        {(demo || session?.user.role === 'ADMIN') && (
          <>
            <p className="nav-caption admin-caption">MANAGEMENT</p>
            <Link
              href="/admin"
              className={`nav-item ${pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              <ShieldCheck size={19} />
              Admin console
              <ArrowUpRight size={15} className="nav-end" />
            </Link>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="commute-art">
            <div className="commute-art-overlay">
              <span className="tiny-tag">A BETTER WAY TO CAMPUS</span>
              <strong>
                Less waiting.
                <br />
                More living.
              </strong>
              <span>Every ride, a little easier.</span>
            </div>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            Help & support
            <ArrowUpRight size={15} />
          </button>
          <div className="profile">
            <span className="avatar">{session?.user.name?.slice(0, 2).toUpperCase() ?? 'AS'}</span>
            <span>
              <strong>{session?.user.name ?? (demo ? 'Arjun Sharma' : 'College student')}</strong>
              <small>
                {demo
                  ? 'Student · Demo workspace'
                  : (session?.user.role?.toLowerCase() ?? 'Student')}
              </small>
            </span>
            {session ? (
              <button
                title="Sign out"
                aria-label="Sign out"
                className="icon-button"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut size={17} />
              </button>
            ) : (
              <Link href="/login" aria-label="Account" title="Sign in">
                <ChevronDown size={16} />
              </Link>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span>Student workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <span className="live-dot" />
              {demo ? 'Demo connected' : 'Campus network'}
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              title={dark ? 'Light mode' : 'Dark mode'}
              aria-label={dark ? 'Light mode' : 'Dark mode'}
              onClick={toggleTheme}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link
              href="/alerts"
              className="icon-button notification-button"
              aria-label="View notifications"
              title="Notifications"
            >
              <Bell size={20} />
              {notificationCount > 0 && <i />}
            </Link>
            <span className="avatar small">
              {session?.user.name?.slice(0, 2).toUpperCase() ?? 'AS'}
            </span>
          </div>
        </header>
        <main className="main-content">{children}</main>
        <footer className="page-footer">
          <span>
            <BusFront size={14} />
            IIIT BusPulse <span className="footer-dot">·</span> Your campus. Your commute.
          </span>
          <span>
            <span className="live-dot" />
            {demo ? 'Simulated GPS · Demonstration mode' : 'Location updates every 3 seconds'}
          </span>
        </footer>
      </div>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent
          title="Campus transport desk"
          description="Indian Institute of Information Technology Dharwad"
        >
          <div className="help-details">
            <GraduationCap size={32} />
            <p>
              For route assignments, schedule changes, and transport assistance, contact your
              college transportation office.
            </p>
            <p>
              <MapPin size={16} />
              Ittigatti Road, Dharwad, Karnataka
            </p>
            <a href="https://iiitdwd.ac.in" target="_blank" rel="noreferrer">
              College website <ArrowUpRight size={16} />
            </a>
            <Button onClick={() => setHelp(false)}>Back to workspace</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
