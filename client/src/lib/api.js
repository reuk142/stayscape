export async function api(endpoint, options={}) {
  const isForm = options.body instanceof FormData || options.body instanceof Blob;
  let res;
  try {
    res = await fetch(`/api${endpoint}`, { credentials:'include', ...options, headers: { ...(!isForm && options.body ? { 'Content-Type':'application/json' } : {}), ...options.headers } });
  } catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Cannot connect to server. Check that the backend is running.'); }
  let data = {};
  try { data = await res.json(); } catch { if (res.ok) throw new Error('The server returned an invalid response. Please try again.'); }
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}
export const money = amount => new Intl.NumberFormat('en-IN', { style:'currency',currency:'INR',maximumFractionDigits:0 }).format(amount || 0);
export const isoDay = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
export const utcToday = () => new Date().toISOString().slice(0,10);
export const dateLabel = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export function nightsBetween(start,end){if(!start||!end)return 0;return Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000);}
