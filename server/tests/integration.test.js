import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { Writable } from 'node:stream';

const testUrl = process.env.TEST_DATABASE_URL;
test('PostgreSQL API flows and concurrency', { skip: !testUrl && 'Set TEST_DATABASE_URL to run real database integration tests' }, async t => {
  // Use a fresh schema, never clear or replace any existing database or schema.
  const schema = 'stayscape_test_' + randomBytes(8).toString('hex');
  const admin = new pg.Pool({ connectionString: testUrl });
  await admin.query(`CREATE SCHEMA ${schema}`);
  process.env.DATABASE_URL = testUrl;
  process.env.PGSCHEMA = schema;
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  process.env.NODE_ENV = 'test';
  const { pool } = await import('../src/db.js');
  const { runMigrations } = await import('../src/migrations.js');
  const { app } = await import('../src/app.js');
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end();
    // Only remove the random schema created by this exact test run.
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  });
  await Promise.all([runMigrations(), runMigrations()]);
  await runMigrations();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(route, { method = 'GET', body, cookie, headers = {} } = {}) {
    const response = await fetch(base + route, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  }
  const password = 'Private-test-password-42!';
  const host = await request('/auth/register', {method:'POST', body:{name:'Test Host',email:'host@test.example',password,role:'host'}});
  const guest = await request('/auth/register', {method:'POST', body:{name:'Test Guest',email:'guest@test.example',password}});
  const other = await request('/auth/register', {method:'POST', body:{name:'Other Guest',email:'other@test.example',password}});
  assert.equal(host.status,201); assert.equal(guest.status,201); assert.equal(other.status,201);
  const listing = {title:'Quiet hillside test cabin',description:'A spacious and peaceful cabin with mountain views, a kitchen, and a lovely terrace.',city:'Manali',country:'India',category:'Cabins',price:2500,maxGuests:4,images:[{url:'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8'}],coordinates:{lat:32.24,lng:77.18},amenities:['WiFi','Kitchen']};
  let id, booking;
  await t.test('authentication, secure cookies, profile, and authorization', async () => {
    assert.equal((await request('/auth/login',{method:'POST',body:{email:'guest@test.example',password:'wrong'}})).status,401);
    const login = await request('/auth/login',{method:'POST',body:{email:'GUEST@test.example',password}});
    assert.equal(login.status,200); assert.match(login.headers.get('set-cookie'),/HttpOnly/);
    assert.match(login.headers.get('set-cookie'),/SameSite=Lax/);
    assert.equal((await request('/auth/me',{cookie:guest.cookie})).data.user.id, guest.data.user.id);
    assert.equal((await request('/auth/register',{method:'POST',body:{name:'Another',email:'GUEST@test.example',password}})).status,409);
    assert.equal((await request('/auth/register',{method:'POST',body:{name:'Another',email:'unicode@test.example',password:'😀'.repeat(25)}})).status,400);
    assert.equal((await request('/auth/profile',{method:'PATCH',cookie:guest.cookie,body:{name:'Updated Guest'}})).data.user.name,'Updated Guest');
    assert.equal((await request('/listings',{method:'POST',body:listing})).status,401);
    assert.equal((await request('/listings',{method:'POST',cookie:guest.cookie,body:listing})).status,403);
    assert.equal((await request('/auth/logout',{method:'POST',cookie:guest.cookie})).status,200);
    assert.equal((await request('/auth/me',{cookie:'stayscape_session=invalid'})).data.user,null);
  });
  await t.test('listing CRUD, validation, filters, pagination, wishlist and owner checks', async () => {
    const created = await request('/listings',{method:'POST',cookie:host.cookie,body:listing});
    assert.equal(created.status,201); id=created.data.listing._id;
    assert.equal((await request('/listings/'+id)).data.listing.price,2500);
    assert.equal((await request('/listings?guests=abc')).status,400);
    assert.equal((await request('/listings?category=Cabins&q=Manali&limit=1')).data.total,1);
    assert.equal((await request('/listings?q=%27%20OR%201%3D1%20--')).data.total,0);
    assert.equal((await request('/listings?maxPrice=2000')).data.total,0);
    assert.equal((await request('/listings?limit=1&page=2')).data.listings.length,0);
    assert.equal((await request('/listings/not-an-id')).status,400);
    assert.equal((await request('/listings/'+randomUUID()+'/availability')).status,404);
    const secondHost = await request('/auth/register',{method:'POST',body:{name:'Other Host',email:'otherhost@test.example',password,role:'host'}});
    assert.equal((await request('/listings/'+id,{method:'PUT',cookie:secondHost.cookie,body:listing})).status,403);
    assert.equal((await request('/listings/'+id,{method:'DELETE',cookie:secondHost.cookie})).status,403);
    assert.equal((await request('/listings/'+id,{method:'PUT',cookie:host.cookie,body:{...listing,price:3000}})).status,200);
    assert.deepEqual((await request('/auth/wishlist/'+id,{method:'POST',cookie:guest.cookie})).data.wishlist,[id]);
    assert.equal((await request('/listings/wishlist',{cookie:guest.cookie})).data.listings.length,1);
    assert.deepEqual((await request('/auth/wishlist/'+id,{method:'POST',cookie:guest.cookie})).data.wishlist,[]);
    const temporary = await request('/listings',{method:'POST',cookie:host.cookie,body:{...listing,title:'Temporary property for delete'}});
    assert.equal((await request('/listings/'+temporary.data.listing._id,{method:'DELETE',cookie:host.cookie})).status,200);
  });
  const stay = {listingId:undefined,checkIn:'2035-06-10',checkOut:'2035-06-13',guests:2};
  await t.test('concurrent overlapping requests: exactly one commits, totals use server price', async () => {
    stay.listingId=id;
    const results=await Promise.all([guest,other].map(user=>request('/bookings',{method:'POST',cookie:user.cookie,body:{...stay,total:1}})));
    assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
    const winner=results.findIndex(r=>r.status===201); booking={...results[winner].data.booking,cookie:[guest,other][winner].cookie};
    assert.equal(booking.total,9000); assert.equal(booking.checkIn,'2035-06-10');
    assert.equal((await pool.query('SELECT count(*)::integer AS n FROM bookings')).rows[0].n,1);
    assert.deepEqual((await request('/listings/'+id+'/availability')).data.bookedDates,['2035-06-10','2035-06-11','2035-06-12']);
    assert.equal((await request('/listings?checkIn=2035-06-11&checkOut=2035-06-12')).data.total,0);
    assert.equal((await request('/listings?checkIn=2035-06-13&checkOut=2035-06-14')).data.total,1);
    assert.equal((await request('/bookings',{method:'POST',cookie:host.cookie,body:stay})).status,400);
    assert.equal((await request('/bookings',{method:'POST',cookie:guest.cookie,body:{...stay,guests:5}})).status,400);
    assert.equal((await request('/bookings',{method:'POST',cookie:guest.cookie,body:{...stay,checkIn:'2020-01-01'}})).status,400);
  });
  await t.test('history, cancellation authorization, released availability and rebooking', async () => {
    assert.equal((await request('/bookings/mine',{cookie:booking.cookie})).data.bookings.length,1);
    assert.equal((await request('/bookings/'+booking._id+'/cancel',{method:'PATCH',cookie:host.cookie})).status,404);
    assert.equal((await request('/reviews',{method:'POST',cookie:booking.cookie,body:{bookingId:booking._id,rating:5,comment:'This stay was excellent.'}})).status,403);
    assert.equal((await request('/listings/'+id,{method:'DELETE',cookie:host.cookie})).status,409);
    assert.equal((await request('/bookings/'+booking._id+'/cancel',{method:'PATCH',cookie:booking.cookie})).status,200);
    assert.equal((await request('/bookings/'+booking._id+'/cancel',{method:'PATCH',cookie:booking.cookie})).status,409);
    assert.deepEqual((await request('/listings/'+id+'/availability')).data.bookedDates,[]);
    assert.equal((await request('/bookings',{method:'POST',cookie:guest.cookie,body:stay})).status,201);
  });
  await t.test('completed-stay reviews, duplicates, concurrent rating aggregates and analytics', async () => {
    // Historical fixtures are only inserted in this test's private schema.
    const pastIds=[];
    for (const user of [guest,other]) {
      const r=await pool.query("INSERT INTO bookings(listing_id,guest_id,check_in,check_out,nights,guests,total) VALUES($1,$2,'2020-01-01','2020-01-03',2,1,6000) RETURNING id",[id,user.data.user.id]);
      pastIds.push(r.rows[0].id);
    }
    const reviews=await Promise.all([guest,other].map((user,i)=>request('/reviews',{method:'POST',cookie:user.cookie,body:{bookingId:pastIds[i],rating:i?3:5,comment:'A lovely place with a wonderful host.'}})));
    assert.deepEqual(reviews.map(r=>r.status),[201,201]);
    const detail=(await request('/listings/'+id)).data;
    assert.equal(detail.listing.averageRating,4); assert.equal(detail.listing.reviewCount,2);
    assert.equal((await request('/reviews',{method:'POST',cookie:guest.cookie,body:{bookingId:pastIds[0],rating:5,comment:'Another review of the same stay.'}})).status,409);
    const history=(await request('/bookings/mine',{cookie:guest.cookie})).data.bookings;
    assert.equal(history.find(b=>b._id===pastIds[0]).reviewed,true);
    assert.equal((await request('/bookings/'+pastIds[0]+'/cancel',{method:'PATCH',cookie:guest.cookie})).status,409);
    assert.equal((await request('/analytics',{cookie:guest.cookie})).status,403);
    const analytics=await request('/analytics',{cookie:host.cookie});
    assert.equal(analytics.status,200); assert.equal(analytics.data.months.length,6);
    assert.equal((await request('/listings/mine',{cookie:host.cookie})).data.bookings.length,4);
  });
  await t.test('CSRF, malformed JSON, security headers and upload validation', async () => {
    assert.equal((await request('/auth/logout',{method:'POST',cookie:guest.cookie,headers:{Origin:'https://evil.example'}})).status,403);
    assert.equal((await request('/auth/logout',{method:'POST',cookie:guest.cookie,headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
    assert.equal((await request('/auth/login',{method:'POST',body:'{bad-json'})).status,400);
    assert.equal((await request('/uploads',{method:'POST',cookie:guest.cookie,body:{}})).status,403);
    assert.equal((await request('/uploads',{method:'POST',cookie:host.cookie,body:'not an image',headers:{'Content-Type':'application/octet-stream'}})).status,400);
    const health=await request('/health');
    assert.equal(health.status,200); assert.equal(health.headers.get('x-content-type-options'),'nosniff');
    assert.equal(health.headers.get('cache-control'),'no-store');
  });
  await t.test('bounded binary image uploads, missing configuration and Cloudinary adapter', async () => {
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS4kAAAAASUVORK5CYII=','base64');
    const upload=body=>request('/uploads',{method:'POST',cookie:host.cookie,body,headers:{'Content-Type':'application/octet-stream'}});
    assert.equal((await upload(png.subarray(0,8))).status,400);
    assert.equal((await upload(Buffer.alloc(5*1024*1024+1))).status,413);
    const keys=['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'];
    const original=keys.map(key=>process.env[key]);
    for (const key of keys) delete process.env[key];
    assert.equal((await upload(png)).status,503);
    const {v2:cloudinary}=await import('cloudinary');
    const originalUpload=cloudinary.uploader.upload_stream;
    let received=0;
    try {
      keys.forEach(key=>process.env[key]='test-placeholder');
      cloudinary.uploader.upload_stream=(options,callback)=>{
        assert.equal(options.resource_type,'image');
        return new Writable({write(chunk,_encoding,done){received+=chunk.length;done();},final(done){callback(null,{secure_url:'https://res.cloudinary.com/test/image/upload/cabin.png',public_id:'stayscape/test/cabin'});done();}});
      };
      const response=await upload(png);
      assert.equal(response.status,201); assert.equal(received,png.length);
      assert.equal(response.data.image.publicId,'stayscape/test/cabin');
    } finally {
      cloudinary.uploader.upload_stream=originalUpload;
      keys.forEach((key,index)=>{if(original[index]===undefined)delete process.env[key];else process.env[key]=original[index];});
    }
    assert.equal((await request('/auth/become-host',{method:'POST',cookie:other.cookie})).data.user.role,'host');
  });
});
