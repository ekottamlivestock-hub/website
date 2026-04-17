// Quick check: what's in the listings table?
const SUPABASE_URL = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'

async function check() {
  // Check listings (using service role to bypass RLS)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/listings?select=id,title,status,price,seller_id&limit=20`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  })
  const listings = await res.json()
  console.log('=== ALL LISTINGS (service role, bypasses RLS) ===')
  console.log(JSON.stringify(listings, null, 2))
  console.log(`Total: ${listings.length}`)
  
  // Check with anon key (what the website sees)
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzMzNjYsImV4cCI6MjA5MTU0OTM2Nn0.OeC9Ki5f7VRG9lwyEE4GKQwLBNv0BclkXGzPsSR5T-c'
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/listings?select=id,title,status,price&status=eq.approved&limit=20`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    }
  })
  const anonListings = await res2.json()
  console.log('\n=== APPROVED LISTINGS (anon key, through RLS) ===')
  console.log(JSON.stringify(anonListings, null, 2))
  console.log(`Total: ${anonListings.length}`)
  
  // Check profiles
  const res3 = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,role,seller_status&limit=10`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  })
  const profiles = await res3.json()
  console.log('\n=== PROFILES ===')
  console.log(JSON.stringify(profiles, null, 2))
}

check().catch(console.error)
