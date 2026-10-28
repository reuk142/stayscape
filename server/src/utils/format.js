export function userRecord(row) {
  return row && {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    wishlist: row.wishlist || []
  };
}

export function listingRecord(row) {
  return row && {
    _id: row.id,
    host: row.host_id ? { _id: row.host_id, name: row.host_name } : row.host,
    title: row.title,
    description: row.description,
    city: row.city,
    country: row.country,
    address: row.address,
    category: row.category,
    price: Number(row.price),
    maxGuests: Number(row.max_guests),
    bedrooms: Number(row.bedrooms),
    beds: Number(row.beds),
    bathrooms: Number(row.bathrooms),
    amenities: row.amenities || [],
    images: row.images || [],
    coordinates: row.coordinates,
    averageRating: Number(row.average_rating || 0),
    reviewCount: Number(row.review_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function bookingRecord(row, listing = undefined) {
  return row && {
    _id: row.id,
    listing: listing ?? row.listing,
    guest: row.guest,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: Number(row.nights),
    guests: Number(row.guests),
    total: Number(row.total),
    status: row.status,
    reviewed: Boolean(row.reviewed),
    createdAt: row.created_at
  };
}
