import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Header, { Brand } from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './components/AuthContext';
import Home from './pages/Home';
const Auth = lazy(() => import('./pages/Auth'));
const Detail = lazy(() => import('./pages/Detail'));
const Dashboard = lazy(() => import('./pages/Host').then(module => ({default:module.Dashboard})));
const ListingForm = lazy(() => import('./pages/Host').then(module => ({default:module.ListingForm})));
const Trips = lazy(() => import('./pages/Trips'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Profile = lazy(() => import('./pages/Profile'));
function RequireUser({host=false,children}) {
  const {user,loading} = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading-screen">Checking your account...</div>;
  if (!user) return <Navigate to="/login" state={{from:location.pathname + location.search}} replace/>;
  if (host && user.role !== 'host') return <Navigate to="/profile" replace/>;
  return children;
}
function Scroll() { const location = useLocation(); useEffect(() => window.scrollTo(0,0),[location.pathname]); return null; }
function Footer() {
  const { user } = useAuth();
  return <footer className="site-footer"><div className="container footer-main"><div><Brand/><p>Extraordinary places. Unforgettable moments.<br/>Find your next favorite place to stay.</p></div><div className="footer-links"><div><b>Explore</b><Link to="/">Discover stays</Link><Link to={user ? '/profile' : '/register'}>Become a host</Link></div><div><b>StayScape</b><span>A place for your next adventure</span><span>Made for curious travelers</span></div></div></div><div className="container footer-bottom"><span>Copyright {new Date().getFullYear()} StayScape. Educational demonstration.</span><span>Not affiliated with Airbnb. No real payments are processed.</span></div></footer>;
}
function Content() {
  return <><a className="skip-link" href="#page-content">Skip to content</a><Scroll/><Header/><div id="page-content" tabIndex={-1}><ErrorBoundary><Suspense fallback={<div className="loading-screen" role="status">Opening your next escape...</div>}><Routes>
    <Route path="/" element={<Home/>}/><Route path="/stays/:id" element={<Detail/>}/><Route path="/login" element={<Auth/>}/><Route path="/register" element={<Auth register/>}/><Route path="/profile" element={<RequireUser><Profile/></RequireUser>}/><Route path="/trips" element={<RequireUser><Trips/></RequireUser>}/><Route path="/wishlist" element={<RequireUser><Wishlist/></RequireUser>}/><Route path="/host" element={<RequireUser host><Dashboard/></RequireUser>}/><Route path="/host/new" element={<RequireUser host><ListingForm/></RequireUser>}/><Route path="/host/edit/:id" element={<RequireUser host><ListingForm/></RequireUser>}/><Route path="*" element={<main className="container empty-state top-space"><h1>Page not found</h1><Link className="btn btn-accent" to="/">Return home</Link></main>}/>
  </Routes></Suspense></ErrorBoundary></div><Footer/></>;
}
export default function App() { return <BrowserRouter><AuthProvider><Content/></AuthProvider></BrowserRouter>; }
