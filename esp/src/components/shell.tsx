'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BusFront,
  Radio,
  Route,
  History,
  Bell,
  ShieldCheck,
  ArrowUpRight,
  Menu,
  X,
  Sun,
  Moon,
  GraduationCap,
  LogOut,
  HelpCircle,
  MapPin,
  CalendarClock,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
const links = [
  { href: '/', label: 'Live tracking', icon: Radio },
  { href: '/routes', label: 'Bus routes', icon: Route },
  { href: '/schedule', label: 'Schedule', icon: CalendarClock },
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
      {menuOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <header className="site-header" aria-label={`${title} workspace header`}>
        <Link href="/" className="brand">
          <Image
            src="/iiit-logo.png"
            alt="Indian Institute of Information Technology Dharwad"
            width={523}
            height={180}
            className="brand-logo"
            priority
          />
          <span className="brand-text">
            <span className="brand-light">BusPulse</span>
            <small>CAMPUS TRANSPORT</small>
          </span>
        </Link>
        <nav className={`top-navigation ${menuOpen ? 'top-navigation-open' : ''}`} aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`nav-item ${pathname === href ? 'active' : ''}`}
              aria-current={pathname === href ? 'page' : undefined}
            >
              <Icon size={19} />
              {label}
              {href === '/' && <span className="nav-live-dot" />}
              {href === '/alerts' && notificationCount > 0 && (
                <span className="nav-count">{notificationCount}</span>
              )}
            </Link>
          ))}
        <Link
          href="/admin"
          onClick={() => setMenuOpen(false)}
          className={`nav-item ${pathname.startsWith('/admin') ? 'active' : ''}`}
          aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
        >
          <ShieldCheck size={19} />
          Admin console
          <ArrowUpRight size={15} className="nav-end" />
        </Link>
          <button
            className="mobile-help-link"
            onClick={() => {
              setHelp(true);
              setMenuOpen(false);
            }}
          >
            <HelpCircle size={18} />
            Help & support
          </button>
          {session ? (
            <button
              className="mobile-help-link"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut size={18} />
              Sign out
            </button>
          ) : (
            <Link href="/login" className="mobile-help-link" onClick={() => setMenuOpen(false)}>
              <ShieldCheck size={18} />
              Admin sign in
            </Link>
          )}
        </nav>
        <div className="header-actions">
          <span className="connection">
            <span className="live-dot" />
            {demo ? 'Demo connected' : 'Campus network'}
          </span>
          <button
            className="icon-button header-help"
            title="Help & support"
            aria-label="Help & support"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={19} />
          </button>
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
          <span className="account-name">
            <strong>{session?.user.name ?? (demo ? 'Arjun Sharma' : 'College student')}</strong>
            <small>{session ? session.user.role?.toLowerCase() : demo ? 'Student · Demo workspace' : 'Student'}</small>
          </span>
          <span className="avatar small">
            {session?.user.name?.slice(0, 2).toUpperCase() ?? 'AS'}
          </span>
          {session ? (
            <button
              title="Sign out"
              aria-label="Sign out"
              className="icon-button header-sign-out"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut size={17} />
            </button>
          ) : (
            <Link href="/login" aria-label="Admin sign in" title="Admin sign in" className="icon-button header-sign-out">
              <ShieldCheck size={17} />
            </Link>
          )}
        </div>
        <button
          className="icon-button mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>
      <div className="main-shell">
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
