import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, MapPin, Star, ArrowRight, CheckCircle, X, MessageCircle } from 'lucide-react';
import { api, dateLabel, money, utcToday } from '../lib/api';
import Dialog from '../components/Dialog';

export default function Trips() {
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [reviewing, setReviewing] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  async function refresh() {
    try { const data = await api('/bookings/mine'); setBookings(data.bookings); setError(''); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  async function cancel(id) {
    if (!window.confirm('Cancel this reservation? The dates will become available again.')) return;
    setBusy(true); setError('');
    try { await api('/bookings/' + id + '/cancel', {method:'PATCH'}); setNotice('Booking cancelled. Your dates have been released.'); await refresh(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function review(event) {
    event.preventDefault(); setBusy(true); setReviewError('');
    try {
      await api('/reviews', {method:'POST', body:JSON.stringify({bookingId:reviewing, rating, comment})});
      setReviewing(null); setComment(''); setRating(5); setNotice('Thanks for sharing your review!'); await refresh();
    } catch (error) { setReviewError(error.message); }
    finally { setBusy(false); }
  }
  return <main className="container trips-page top-space">
    <span className="eyebrow">YOUR TRAVEL JOURNAL</span><h1>Your trips</h1><p className="page-subtitle">Beautiful memories start with a great place to stay.</p>
    {notice && <div className="success-banner" role="status"><CheckCircle size={20}/>{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16}/></button></div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="loading-screen">Loading your trips...</div> : bookings.length ? <div className="trip-list">{bookings.map(booking => <article key={booking._id} className="trip-card">
      <img src={booking.listing?.images?.[0]?.url} alt={booking.listing?.title || 'Property'}/>
      <div className="trip-info"><span className={'status ' + booking.status}>{booking.status === 'confirmed' && booking.checkOut <= utcToday() ? 'Completed' : booking.status}</span><Link to={'/stays/' + booking.listing?._id}><h2>{booking.listing?.title || 'Stay'}</h2></Link><span className="trip-location"><MapPin size={15}/>{booking.listing?.city}</span><div className="trip-dates"><CalendarDays size={16}/> {dateLabel(booking.checkIn)} to {dateLabel(booking.checkOut)} / {booking.nights} nights / {booking.guests} guests</div><strong>{money(booking.total)}</strong></div>
      <div className="trip-actions">{booking.status === 'confirmed' && booking.checkIn > utcToday() && <button disabled={busy} className="btn btn-outline btn-sm" onClick={() => cancel(booking._id)}>Cancel booking</button>}{booking.status === 'confirmed' && booking.checkOut <= utcToday() && (booking.reviewed ? <span className="pill">Review shared</span> : <button className="btn btn-accent btn-sm" onClick={() => {setReviewError(''); setReviewing(booking._id);}}><MessageCircle size={15}/> Write a review</button>)}</div>
    </article>)}</div> : !error && <div className="empty-state"><CalendarDays size={38}/><h2>Your next story is waiting</h2><p>Once you reserve a place, you'll find your trips here.</p><Link to="/" className="btn btn-accent">Explore stays <ArrowRight size={18}/></Link></div>}
    {reviewing && <Dialog title="How was your stay?" onClose={() => { if (!busy) setReviewing(null); }}><form onSubmit={review} className="review-form"><div className="star-buttons" role="group" aria-label="Rating">{[1,2,3,4,5].map(value => <button type="button" aria-label={value + ' stars'} aria-pressed={rating === value} key={value} onClick={() => setRating(value)}><Star size={31} fill={value <= rating ? '#f4b34d' : 'none'} color="#f4b34d"/></button>)}</div><label>Your review<textarea autoFocus required minLength={10} maxLength={1200} rows={4} value={comment} onChange={event => setComment(event.target.value)} placeholder="Tell future travelers what made this stay special..."/></label>{reviewError && <p className="form-error" role="alert">{reviewError}</p>}<button disabled={busy} className="btn btn-accent btn-wide">{busy ? 'Posting...' : 'Post review'}</button></form></Dialog>}
  </main>;
}
