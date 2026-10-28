import { money } from '../lib/api';

export default function HostAnalytics({ analytics, listingCount }) {
  if (!analytics) return null;
  const maximum = Math.max(1, ...analytics.months.map(month => month.bookedValue));
  const capacity = listingCount * 30;
  return <section className="dashboard-panel analytics-panel" aria-labelledby="analytics-title">
    <div className="panel-header"><div><h2 id="analytics-title">Hosting at a glance</h2><p>Reservation value by creation month. Cancelled stays are excluded from value.</p></div><span className="pill">Last 6 months</span></div>
    <div className="analytics-content"><div className="analytics-chart" role="img" aria-label="Monthly booked value; exact values appear in the table below">
      {analytics.months.map(month => <div className="chart-column" key={month.month}><span>{money(month.bookedValue)}</span><div className="chart-track"><div className="chart-bar" style={{height: `${Math.max(2, month.bookedValue / maximum * 100)}%`}}/></div><small>{new Date(month.month + '-01T00:00:00Z').toLocaleDateString('en-IN',{month:'short', timeZone:'UTC'})}</small></div>)}
    </div><p className="occupancy"><b>{capacity ? Math.round(analytics.occupiedNightsNext30 / capacity * 100) : 0}% occupancy</b> over the next 30 nights ({analytics.occupiedNightsNext30} occupied property nights out of {capacity}).</p></div>
    <div className="table-wrap"><table className="booking-table"><caption className="sr-only">Monthly hosting analytics</caption><thead><tr><th scope="col">Month</th><th scope="col">Reservations</th><th scope="col">Cancelled</th><th scope="col">Booked value</th></tr></thead><tbody>{analytics.months.map(month => <tr key={month.month}><th scope="row">{month.month}</th><td>{month.reservations}</td><td>{month.cancellations}</td><td>{money(month.bookedValue)}</td></tr>)}</tbody></table></div>
  </section>;
}
