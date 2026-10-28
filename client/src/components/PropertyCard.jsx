import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Star, MapPin } from 'lucide-react';
import { money } from '../lib/api';
import { useAuth } from './AuthContext';
export default function PropertyCard({listing}) {
  const {user,toggleWishlist} = useAuth();
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const stay = new URLSearchParams();
  for (const key of ['checkIn','checkOut','guests']) if(params.get(key)) stay.set(key,params.get(key));
  const href = '/stays/' + listing._id + (stay.size ? '?' + stay : '');
  const liked = user?.wishlist?.includes(listing._id);
  async function wish() {
    if (!user) { navigate('/login'); return; }
    setPending(true); setError('');
    try { await toggleWishlist(listing._id); } catch(error) { setError(error.message); } finally { setPending(false); }
  }
  return <article className="property-card"><div className="property-photo"><Link to={href} aria-label={listing.title}><img src={listing.images?.[0]?.url} loading="lazy" alt={listing.title}/></Link>{listing.reviewCount >= 3 && listing.averageRating >= 4.8 && <span className="photo-badge">Guest favorite</span>}<button type="button" className={'like-btn ' + (liked?'liked':'')} onClick={wish} disabled={pending} aria-pressed={Boolean(liked)} aria-label={(liked?'Remove from wishlist: ':'Save property: ') + listing.title}><Heart size={20} fill={liked?'currentColor':'none'}/></button></div><Link to={href}><div className="property-meta"><span><MapPin size={14}/>{listing.city}, {listing.country}</span><span className="rating"><Star size={14} fill="currentColor"/> {listing.reviewCount?listing.averageRating.toFixed(1):'New'}</span></div><h3>{listing.title}</h3><p className="property-extra">{listing.category} / Up to {listing.maxGuests} guests</p><p className="property-price"><strong>{money(listing.price)}</strong><span> / night</span></p></Link>{error && <p className="form-error" role="alert">{error}</p>}</article>;
}
