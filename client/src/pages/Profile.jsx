import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import './Profile.css';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function becomeHost() {
    setBusy(true); setError('');
    try { const data = await api('/auth/become-host', { method: 'POST' }); setUser(data.user); setSaved(true); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const data = await api('/auth/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
      setUser(data.user);
      setName(data.user.name);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container top-space auth-content profile-page">
      <span className="eyebrow">YOUR STAYSCAPE ACCOUNT</span>
      <h1>Profile</h1>
      <p className="page-subtitle">Manage the details travelers and hosts see about you.</p>
      <form className="auth-form" onSubmit={saveProfile}>
        <label htmlFor="profile-name">Full name
          <input id="profile-name" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} />
        </label>
        <label htmlFor="profile-email">Email address
          <input id="profile-email" type="email" value={user.email} readOnly />
        </label>
        <div className="profile-role"><UserRound size={18} /> Account type <b>{user.role === 'host' ? 'Host' : 'Guest'}</b></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        {saved && <div className="success-banner"><Check size={18} /> Profile updated.</div>}
        <button className="btn btn-accent btn-wide" disabled={busy || name.trim() === user.name}>
          {busy ? 'Saving...' : 'Save changes'}
        </button>
      </form>
      <div className="profile-shortcuts">
        {user.role !== 'host' && <button disabled={busy} className="btn btn-accent" onClick={becomeHost}>Become a host</button>}
        <Link className="btn btn-outline" to={user.role === 'host' ? '/host' : '/trips'}>
          {user.role === 'host' ? 'Go to host dashboard' : 'View your trips'} <ArrowRight size={17} />
        </Link>
        <Link className="btn btn-outline" to="/wishlist">Open wishlist <ArrowRight size={17} /></Link>
      </div>
    </main>
  );
}
