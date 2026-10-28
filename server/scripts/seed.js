import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, transaction } from '../src/db.js';
import { runMigrations } from '../src/migrations.js';
if (!process.env.SEED_DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD.length < 12) {
  console.error('Set SEED_DEMO_PASSWORD to a private password of at least 12 characters in server/.env.');
  process.exit(1);
}
const password = process.env.SEED_DEMO_PASSWORD;
const image = (a,b) => [{url:`https://images.unsplash.com/${a}?auto=format&fit=crop&w=1600&q=85`},{url:`https://images.unsplash.com/${b}?auto=format&fit=crop&w=1600&q=85`}];
const properties = [
  {title:'Casa Solara — Private Pool Escape',city:'Goa',country:'India',category:'Beachfront',price:8500,maxGuests:6,bedrooms:3,beds:3,bathrooms:3,coordinates:{lat:15.501,lng:73.825},images:image('photo-1499793983690-e29da59ef1c2','photo-1520250497591-112f2f40a3f4'),description:'Slow mornings, private pool dips and golden coastal sunsets. This airy villa brings together tropical architecture, spacious rooms and the best of beach life.',amenities:['WiFi','Pool','Air conditioning','Kitchen','Free parking']},
  {title:'The Pine House — Mountain Hideaway',city:'Manali',country:'India',category:'Cabins',price:5900,maxGuests:4,bedrooms:2,beds:2,bathrooms:2,coordinates:{lat:32.243,lng:77.189},images:image('photo-1449158743715-0a90ebb6d2d8','photo-1482192596544-9eb780fc7f66'),description:'A wood-lined sanctuary wrapped in tall pines and crisp mountain air. Enjoy slow breakfasts on the balcony and unforgettable Himalayan views.',amenities:['Mountain view','WiFi','Fireplace','Kitchen','Free parking']},
  {title:'The Pearl Courtyard — Heritage Stay',city:'Jaipur',country:'India',category:'Design',price:7200,maxGuests:5,bedrooms:2,beds:3,bathrooms:2,coordinates:{lat:26.923,lng:75.812},images:image('photo-1600607687939-ce8a6c25118c','photo-1600210492486-724fe5c67fb0'),description:'A curated heritage-inspired home with beautiful archways, warm stone and modern conveniences. A peaceful base for exploring the Pink City.',amenities:['WiFi','Kitchen','Air conditioning','Workspace']},
  {title:'Skyline Studio — City Lights',city:'Mumbai',country:'India',category:'City',price:6400,maxGuests:2,bedrooms:1,beds:1,bathrooms:1,coordinates:{lat:19.076,lng:72.878},images:image('photo-1522708323590-d24dbb6b0267','photo-1600566753190-17f0baa2a6c3'),description:'Wake up above the city in a bright, design-led apartment. Great coffee, smart work areas, and a welcoming space after every adventure.',amenities:['WiFi','Air conditioning','Workspace','Kitchen']},
  {title:'Lakeview Haven — Tranquil Retreat',city:'Udaipur',country:'India',category:'Amazing views',price:9800,maxGuests:4,bedrooms:2,beds:2,bathrooms:2,coordinates:{lat:24.586,lng:73.683},images:image('photo-1613977257363-707ba9348227','photo-1540518614846-7eded433c457'),description:'Sunsets over the lake, a breezy rooftop terrace, and rooms made for truly slowing down. Experience Udaipur from your own serene hideaway.',amenities:['Lake view','Breakfast','WiFi','Air conditioning','Terrace']},
  {title:'Fernwood Cottage — Tea Hills',city:'Ooty',country:'India',category:'Countryside',price:4100,maxGuests:4,bedrooms:2,beds:2,bathrooms:1,coordinates:{lat:11.407,lng:76.693},images:image('photo-1510798831971-661eb04b3739','photo-1449844908441-8829872d2607'),description:'A charming cottage immersed in rolling hills and green gardens. Listen to birdsong, explore nearby trails and unwind with your favorite people.',amenities:['Garden','Mountain view','Kitchen','Free parking']},
  {title:'Cloud Nine — Panoramic Villa',city:'Lonavala',country:'India',category:'Mountains',price:11200,maxGuests:8,bedrooms:4,beds:4,bathrooms:4,coordinates:{lat:18.754,lng:73.406},images:image('photo-1613490493576-7fde63acd811','photo-1580587771525-78b9dba3b914'),description:'An extraordinary hillside villa for family celebrations, featuring sweeping views, stylish interiors and a refreshing pool with a view.',amenities:['Pool','Mountain view','WiFi','Kitchen','Free parking']},
  {title:'Riverstone Retreat — Nature First',city:'Rishikesh',country:'India',category:'Amazing views',price:5300,maxGuests:4,bedrooms:2,beds:2,bathrooms:2,coordinates:{lat:30.086,lng:78.267},images:image('photo-1448375240586-882707db888b','photo-1473448912268-2022ce9509d8'),description:'A calm escape surrounded by forest and fresh air, moments away from riverside adventure. Simple luxury, thoughtful touches and restorative mornings.',amenities:['WiFi','River view','Garden','Workspace','Parking']}
];
try {
  await runMigrations();
  const added = await transaction(async client => {
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Aarav Sharma', 'host@stayscape.demo', $1, 'host')
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, updated_at=now()
       RETURNING id`,
      [passwordHash]
    );
    const hostId = userResult.rows[0].id;
    let count = 0;
    for (const property of properties) {
      const result = await client.query(
        `INSERT INTO listings
         (host_id,title,description,city,country,address,category,price,max_guests,bedrooms,beds,bathrooms,amenities,images,coordinates)
         VALUES ($1,$2,$3,$4,$5,'',$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb)
         ON CONFLICT DO NOTHING RETURNING id`,
        [hostId, property.title, property.description, property.city, property.country, property.category, property.price,
          property.maxGuests, property.bedrooms, property.beds, property.bathrooms, JSON.stringify(property.amenities),
          JSON.stringify(property.images), JSON.stringify(property.coordinates)]
      );
      count += result.rowCount;
    }
    return count;
  });
  console.log(`Added ${added} sample listings. Demo host: host@stayscape.demo`);
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
