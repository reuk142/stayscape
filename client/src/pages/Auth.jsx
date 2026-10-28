import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, Globe, Home } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
export default function Auth({register=false}) {
  const {user,login,loading:checking} = useAuth();
  const location = useLocation();
  const [form,setForm] = useState({name:'',email:'',password:'',role:'guest'});
  const [show,setShow] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const target = location.state?.from;
  if (checking) return <div className="loading-screen">Checking your account...</div>;
  if (user) return <Navigate to={typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : user.role === 'host' ? '/host' : '/'} replace/>;
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try { await login(form,register); } catch(error) { setError(error.message); } finally { setLoading(false); }
  }
  return <main className="auth-page"><div className="auth-photo"><div className="auth-photo-caption"><Sparkles size={24}/><h2>Go somewhere wonderful.</h2><p>There is always a beautiful place waiting to welcome you.</p></div></div><div className="auth-side"><div className="auth-content"><div className="eyebrow">WELCOME TO STAYSCAPE</div><h1>{register?'Create your account':'Welcome back'}</h1><p className="auth-subtitle">{register?'Start your next chapter of travel.':'Log in to discover your next escape.'}</p>
    <form onSubmit={submit} className="auth-form">{register && <label>Full name<input required minLength={2} maxLength={80} autoComplete="name" placeholder="Your full name" value={form.name} onChange={event => setForm({...form,name:event.target.value})}/></label>}
    <label>Email address<input required type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" value={form.email} onChange={event => setForm({...form,email:event.target.value})}/></label>
    <label>Password<div className="password-wrap"><input required autoComplete={register?'new-password':'current-password'} type={show?'text':'password'} minLength={register?8:1} maxLength={register?72:100} placeholder={register?'At least 8 characters':'Enter your password'} value={form.password} onChange={event => setForm({...form,password:event.target.value})}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={() => setShow(value => !value)}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
    {register && <fieldset className="role-fieldset"><legend className="form-legend">I am joining as a</legend><div className="role-options"><button type="button" aria-pressed={form.role === 'guest'} className={form.role === 'guest'?'chosen':''} onClick={() => setForm({...form,role:'guest'})}><Globe size={18}/> Guest <small>Discover &amp; book</small></button><button type="button" aria-pressed={form.role === 'host'} className={form.role === 'host'?'chosen':''} onClick={() => setForm({...form,role:'host'})}><Home size={18}/> Host <small>List my space</small></button></div></fieldset>}
    {error && <div className="form-error" role="alert">{error}</div>}<button className="btn btn-accent btn-wide" disabled={loading}>{loading?'Please wait...':register?'Create account':'Sign in'}<ArrowRight size={18}/></button></form>
    <div className="auth-switch">{register?<>Already have an account? <Link to="/login" state={location.state}>Sign in</Link></>:<>New to StayScape? <Link to="/register" state={location.state}>Create an account</Link></>}</div><p className="auth-trust"><ShieldCheck size={16}/> Your account is protected with secure authentication.</p>
  </div></div></main>;
}
