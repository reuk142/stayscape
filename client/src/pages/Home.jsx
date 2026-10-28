import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, SlidersHorizontal, Waves, Mountain, Trees, Building2, Castle, Sparkles, Leaf, X, ChevronDown } from 'lucide-react';
import { api, utcToday } from '../lib/api';
import PropertyCard from '../components/PropertyCard';
const categories = [['All',Sparkles],['Beachfront',Waves],['Cabins',Trees],['Mountains',Mountain],['Design',Castle],['City',Building2],['Countryside',Leaf],['Amazing views',Mountain]];

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [filters, setFilters] = useState(false);
  const [result, setResult] = useState({ listings: [], total: 0, page: 1, limit: 24 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const search = params.toString();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const requestParams = new URLSearchParams(search);
    if (!requestParams.get('checkIn') || !requestParams.get('checkOut')) { requestParams.delete('checkIn'); requestParams.delete('checkOut'); }
    api('/listings?' + requestParams, { signal: controller.signal })
      .then(setResult).catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search]);
  function update(key, value) {
    setParams(previous => { const next = new URLSearchParams(previous); next.delete('page'); value ? next.set(key, value) : next.delete(key); return next; });
  }
  const category = params.get('category') || 'All';
  return <>
    <section className="hero"><div className="hero-bg"/><div className="hero-cover"/><div className="hero-inner">
      <div className="hero-tag"><Sparkles size={15}/> HANDPICKED STAYS. ENDLESS MEMORIES.</div>
      <h1>Find your <em>somewhere.</em></h1><p>Extraordinary places, unforgettable moments.<br/>Discover your next favorite place to stay.</p>
      <form className="hero-search" onSubmit={event => { event.preventDefault(); update('q', query); }}>
        <div className="hero-search-input"><Search size={23}/><div><label htmlFor="search-stays">Where to?</label><input id="search-stays" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search destinations, cities, stays..." maxLength={100}/></div></div>
        <button className="btn btn-accent" type="submit">Explore stays <ArrowRight size={18}/></button>
      </form><span className="hero-under">Unique stays &nbsp; / &nbsp; Curated experiences &nbsp; / &nbsp; Book with confidence</span>
    </div></section>
    <main id="main-content" className="container homepage">
      <div className="section-kicker">THE BEST OF STAYSCAPE</div><div className="section-title-row"><div><h2>Explore remarkable stays</h2><p>Browse unique homes and spaces for every kind of traveler.</p></div><button className="filter-button" aria-expanded={filters} aria-controls="stay-filters" onClick={() => setFilters(value => !value)}><SlidersHorizontal size={18}/> Filters {filters ? <X size={14}/> : <ChevronDown size={14}/>}</button></div>
      <div className="categories" aria-label="Property categories">{categories.map(([name, Icon]) => <button key={name} aria-pressed={category === name} className={'category ' + (category === name ? 'selected' : '')} onClick={() => update('category', name === 'All' ? '' : name)}><Icon size={21}/><span>{name}</span></button>)}</div>
      {filters && <div className="filters" id="stay-filters">
        <label>Minimum price (INR)<input type="number" min="0" max="10000000" value={params.get('minPrice') || ''} onChange={event => update('minPrice', event.target.value)} placeholder="Any price"/></label>
        <label>Maximum price (INR)<input type="number" min="0" max="10000000" value={params.get('maxPrice') || ''} onChange={event => update('maxPrice', event.target.value)} placeholder="Any price"/></label>
        <label>Guests<input type="number" min="1" max="30" value={params.get('guests') || ''} onChange={event => update('guests', event.target.value)} placeholder="Any group size"/></label>
        <label>Check-in<input type="date" min={utcToday()} value={params.get('checkIn') || ''} onChange={event => update('checkIn', event.target.value)}/></label>
        <label>Check-out<input type="date" min={params.get('checkIn') || utcToday()} value={params.get('checkOut') || ''} onChange={event => update('checkOut', event.target.value)}/></label>
        <label>Sort by<select value={params.get('sort') || 'new'} onChange={event => update('sort', event.target.value)}><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Highest rating</option></select></label>
        <button className="text-button" onClick={() => { setParams({}); setQuery(''); }}>Clear all</button>
      </div>}
      <div className="result-heading" aria-live="polite"><b>{loading ? 'Finding stays...' : result.total + ' beautiful stays'}</b><span>{params.get('q') ? 'Results for ' + params.get('q') : 'Discover something different'}</span></div>
      {error ? <div className="empty-state" role="alert"><h3>Unable to load stays</h3><p>{error}</p><button className="btn btn-outline" onClick={() => {setParams({}); setQuery('');}}>Reset search</button></div> : loading ? <div className="property-grid" aria-label="Loading properties">{Array.from({length:8}, (_, index) => <div key={index} className="skeleton-card"><div className="skeleton-photo"/><div className="skeleton-line"/><div className="skeleton-line short"/></div>)}</div> : result.listings.length ? <div className="property-grid">{result.listings.map(listing => <PropertyCard key={listing._id} listing={listing}/>)}</div> : <div className="empty-state"><Search size={34}/><h3>No matching stays yet</h3><p>Try another city, date range, or price. Your next escape is out there.</p><button className="btn btn-dark" onClick={() => {setParams({}); setQuery('');}}>See all properties</button></div>}
      {!loading && result.total > result.limit && <nav className="pagination" aria-label="Search pages"><button className="btn btn-outline" disabled={result.page <= 1} onClick={() => setParams(previous => {const next = new URLSearchParams(previous); next.set('page', result.page - 1); return next;})}>Previous</button><span>Page {result.page} of {Math.ceil(result.total / result.limit)}</span><button className="btn btn-outline" disabled={result.page * result.limit >= result.total} onClick={() => setParams(previous => {const next = new URLSearchParams(previous); next.set('page', result.page + 1); return next;})}>Next</button></nav>}
    </main>
    <section className="bottom-cta container"><div><span className="section-kicker">YOUR ADVENTURE AWAITS</span><h2>Find the place that feels like yours.</h2><p>Great trips begin with extraordinary stays.</p></div><button className="btn btn-white" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Discover stays <ArrowRight size={18}/></button></section>
  </>;
}
