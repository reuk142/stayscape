import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart,ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import PropertyCard from '../components/PropertyCard';
import { useAuth } from '../components/AuthContext';
export default function Wishlist(){const [listings,setListings]=useState([]);const [error,setError]=useState('');const {user}=useAuth();useEffect(()=>{api('/listings/wishlist').then(d=>setListings(d.listings)).catch(e=>setError(e.message))},[user?.wishlist?.join(',')]);return <main className="container top-space wishlist-page"><span className="eyebrow">SAVED FOR LATER</span><h1>Your wishlist <Heart size={30} color="#fa6b5b"/></h1><p className="page-subtitle">Your favorite escapes, all in one beautiful place.</p>{error&&<div className="form-error">{error}</div>}{listings.length?<div className="property-grid">{listings.map(l=><PropertyCard key={l._id} listing={l}/>)}</div>:<div className="empty-state"><Heart size={39}/><h2>Nothing saved just yet</h2><p>Tap the heart on any property to keep it here.</p><Link to="/" className="btn btn-accent">Find a stay <ArrowRight size={18}/></Link></div>}</main>}
