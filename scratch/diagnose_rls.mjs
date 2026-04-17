// Diagnostic script: Check RLS policies and what authenticated vs anon users see
const SUPABASE_URL = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzMzNjYsImV4cCI6MjA5MTU0OTM2Nn0.OeC9Ki5f7VRG9lwyEE4GKQwLBNv0BclkXGzPsSR5T-c'

async function query(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ query: sql })
  })
  return res.json()
}

async function restQuery(table, params, key, extraHeaders = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      ...extraHeaders,
    }
  })
  return { status: res.status, data: await res.json() }
}

async function diagnose() {
  console.log('=' .repeat(70))
  console.log('EKOTTAM DATABASE DIAGNOSTIC REPORT')
  console.log('=' .repeat(70))

  // 1. Check RLS policies via SQL (using service role)
  console.log('\n\n📋 1. RLS POLICIES ON KEY TABLES')
  console.log('-'.repeat(50))
  
  // Use the pg_policies view
  const policiesRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    // This won't work via REST, so let's do it differently
  })
  
  // Instead, check each table with both anon and service keys
  const tables = ['listings', 'animal_categories', 'animal_breeds', 'profiles', 'listing_media', 'wishlists', 'notifications']
  
  for (const table of tables) {
    console.log(`\n  📦 Table: ${table}`)
    
    // With SERVICE_KEY (bypasses RLS)
    const serviceResult = await restQuery(table, 'select=*&limit=3', SERVICE_KEY, { 'Prefer': 'count=exact' })
    
    // With ANON_KEY (through RLS)
    const anonResult = await restQuery(table, 'select=*&limit=3', ANON_KEY, { 'Prefer': 'count=exact' })
    
    console.log(`    Service Role: status=${serviceResult.status}, rows=${Array.isArray(serviceResult.data) ? serviceResult.data.length : 'ERROR: ' + JSON.stringify(serviceResult.data)}`)
    console.log(`    Anon Key:     status=${anonResult.status}, rows=${Array.isArray(anonResult.data) ? anonResult.data.length : 'ERROR: ' + JSON.stringify(anonResult.data)}`)
    
    if (!Array.isArray(anonResult.data)) {
      console.log(`    ⚠️  ANON ERROR: ${JSON.stringify(anonResult.data)}`)
    }
  }

  // 2. Test listings with joins (exactly how the app does it)
  console.log('\n\n📋 2. LISTINGS WITH JOINS (App Query Pattern)')
  console.log('-'.repeat(50))
  
  // Replicate the exact home page query
  const appQuery = 'select=*,animal_categories(name,slug),profiles(full_name,avatar_url),listing_media(url,sort_order)&status=eq.approved&order=created_at.desc&limit=3'
  
  const serviceJoin = await restQuery('listings', appQuery, SERVICE_KEY)
  const anonJoin = await restQuery('listings', appQuery, ANON_KEY)
  
  console.log(`  Service Role: status=${serviceJoin.status}, rows=${Array.isArray(serviceJoin.data) ? serviceJoin.data.length : 'ERROR'}`)
  console.log(`  Anon Key:     status=${anonJoin.status}, rows=${Array.isArray(anonJoin.data) ? anonJoin.data.length : 'ERROR'}`)
  
  if (!Array.isArray(anonJoin.data)) {
    console.log(`  ⚠️  ANON JOIN ERROR: ${JSON.stringify(anonJoin.data)}`)
  } else if (anonJoin.data.length > 0) {
    console.log(`  Sample listing:`)
    const sample = anonJoin.data[0]
    console.log(`    title: ${sample.title}`)
    console.log(`    animal_categories: ${JSON.stringify(sample.animal_categories)}`)
    console.log(`    profiles: ${JSON.stringify(sample.profiles)}`)
    console.log(`    listing_media count: ${sample.listing_media?.length || 0}`)
  }

  // 3. Check if RLS is actually enabled
  console.log('\n\n📋 3. RLS ENABLED STATUS')
  console.log('-'.repeat(50))
  
  // We can check via information_schema
  for (const table of tables) {
    // Try a raw SQL approach via the SQL endpoint
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      }
    })
    const status = res.status
    const headers = Object.fromEntries(res.headers.entries())
    console.log(`  ${table}: HTTP ${status}, content-range: ${headers['content-range'] || 'N/A'}`)
  }

  // 4. Simulate authenticated user query
  console.log('\n\n📋 4. SIMULATING AUTHENTICATED USER')
  console.log('-'.repeat(50))
  console.log('  To fully test, we need a real JWT from an authenticated user.')
  console.log('  The key question: are the RLS policies returning EMPTY results')
  console.log('  for authenticated users where they should return data?')
  
  // 5. Check the animal_categories specifically (this is what disappears)
  console.log('\n\n📋 5. ANIMAL CATEGORIES (These should always be visible)')
  console.log('-'.repeat(50))
  
  const catService = await restQuery('animal_categories', 'select=*&is_active=eq.true&order=name', SERVICE_KEY)
  const catAnon = await restQuery('animal_categories', 'select=*&is_active=eq.true&order=name', ANON_KEY)
  
  console.log(`  Service Role: ${catService.data.length} categories`)
  if (Array.isArray(catService.data)) {
    catService.data.forEach(c => console.log(`    - ${c.name} (slug: ${c.slug}, active: ${c.is_active})`))
  }
  console.log(`  Anon Key: ${Array.isArray(catAnon.data) ? catAnon.data.length : 'ERROR'} categories`)
  if (!Array.isArray(catAnon.data)) {
    console.log(`    ⚠️  ERROR: ${JSON.stringify(catAnon.data)}`)
  }

  // 6. Check all listings and their statuses
  console.log('\n\n📋 6. ALL LISTINGS STATUS BREAKDOWN')
  console.log('-'.repeat(50))
  
  const allListings = await restQuery('listings', 'select=id,title,status,seller_id', SERVICE_KEY)
  if (Array.isArray(allListings.data)) {
    const statusCounts = {}
    allListings.data.forEach(l => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1
    })
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} listings`)
    })
  }

  // 7. Check profiles table for any issues
  console.log('\n\n📋 7. PROFILES TABLE')
  console.log('-'.repeat(50))
  
  const profilesService = await restQuery('profiles', 'select=id,full_name,role,seller_status', SERVICE_KEY)
  const profilesAnon = await restQuery('profiles', 'select=id,full_name,role,seller_status', ANON_KEY)
  
  console.log(`  Service Role: ${Array.isArray(profilesService.data) ? profilesService.data.length : 'ERROR'} profiles`)
  console.log(`  Anon Key: ${Array.isArray(profilesAnon.data) ? profilesAnon.data.length : 'ERROR'} profiles`)
  
  if (Array.isArray(profilesAnon.data) && profilesAnon.data.length === 0 && Array.isArray(profilesService.data) && profilesService.data.length > 0) {
    console.log(`  ⚠️  CRITICAL: Profiles table returns 0 rows for anon key!`)
    console.log(`  This will cause the JOIN to profiles to return NULL for all listings!`)
  }

  // 8. Check listing_media
  console.log('\n\n📋 8. LISTING MEDIA TABLE')
  console.log('-'.repeat(50))
  
  const mediaService = await restQuery('listing_media', 'select=*&limit=5', SERVICE_KEY)
  const mediaAnon = await restQuery('listing_media', 'select=*&limit=5', ANON_KEY)
  
  console.log(`  Service Role: ${Array.isArray(mediaService.data) ? mediaService.data.length : 'ERROR'} media items`)
  console.log(`  Anon Key: ${Array.isArray(mediaAnon.data) ? mediaAnon.data.length : 'ERROR'} media items`)
  
  if (!Array.isArray(mediaAnon.data)) {
    console.log(`  ⚠️  ERROR: ${JSON.stringify(mediaAnon.data)}`)
  }

  console.log('\n\n' + '='.repeat(70))
  console.log('DIAGNOSTIC COMPLETE')
  console.log('='.repeat(70))
}

diagnose().catch(err => {
  console.error('DIAGNOSTIC FAILED:', err)
})
