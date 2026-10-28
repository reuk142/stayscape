import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Compass, Menu, UserRound, LogOut, Heart, CalendarDays, LayoutDashboard, Plus, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';
export function Brand() { return <Link className="brand" to="/" aria-label="StayScape home"><span className="brand-mark"><Compass size={23} strokeWidth={2.4}/></span><span>stay<span className="brand-accent">scape</span></span><span className="brand-dot">.</span></Link>; }
export default function Header() {
  const {user, logout} = useAuth();
  const [open,setOpen] = useState(false);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const menu = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const close = event => { if (!menu.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown',close); document.addEventListener('keydown',escape);
    return () => { document.removeEventListener('pointerdown',close); document.removeEventListener('keydown',escape); };
  }, []);
  const links = [['/','Explore',Compass], ...(user ? [['/trips','Trips',CalendarDays],['/wishlist','Wishlist',Heart]] : []), ...(user?.role === 'host' ? [['/host','Host dashboard',LayoutDashboard]] : [])];
  async function signout() {
    setBusy(true); setError('');
    try { await logout(); setOpen(false); navigate('/'); } catch(error) { setError(error.message); } finally { setBusy(false); }
  }
  return <header className="site-header"><div className="header-inner"><Brand/>
    <nav className="desktop-nav" aria-label="Main navigation">{links.map(([href,name,Icon]) => <NavLink key={href} to={href} end={href === '/'} className={({isActive}) => 'nav-link' + (isActive?' active':'')}><Icon size={16}/>{name}</NavLink>)}</nav>
    <div className="header-actions" ref={menu}>{user?.role === 'host' ? <Link to="/host/new" className="subtle-btn desktop-only"><Plus size={16}/> List your space</Link> : <span className="header-tag desktop-only"><Sparkles size={14}/> Find your next escape</span>}
      {user ? <button className="profile-button" onClick={() => setOpen(value => !value)} aria-label="Account menu" aria-expanded={open} aria-controls="account-menu"><span className="avatar">{user.name.slice(0,1).toUpperCase()}</span><Menu size={17}/></button> : <Link className="btn btn-dark btn-sm" to="/login"><UserRound size={16}/> Sign in</Link>}
      {user && open && <nav className="profile-menu" id="account-menu" aria-label="Account navigation"><div className="menu-account">Signed in as <b>{user.name}</b></div><Link to="/profile" onClick={() => setOpen(false)}><UserRound size={16}/> Profile</Link>{links.map(([href,name,Icon]) => <Link key={href} to={href} onClick={() => setOpen(false)}><Icon size={16}/>{name}</Link>)}<button disabled={busy} onClick={signout}><LogOut size={16}/>{busy?'Signing out...':'Sign out'}</button>{error && <p className="form-error" role="alert">{error}</p>}</nav>}
    </div></div></header>;
}
