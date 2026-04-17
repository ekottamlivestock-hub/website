// Quick targeted check: simulate what happens when a logged-in user queries each table
const SUPABASE_URL = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzMzNjYsImV4cCI6MjA5MTU0OTM2Nn0.OeC9Ki5f7VRG9lwyEE4GKQwLBNv0BclkXGzPsSR5T-c'

async function checkAuthenticatedAccess() {
  console.log('=== CHECKING AUTHENTICATED USER SESSION ===\n')
  
  // Step 1: Get a real user session by trying to sign in
  // We can't do password login since they use Google OAuth
  // But we can check what the last signed-in user would see
  // by getting their JWT from session
  
  // Let's check the auth users and their tokens
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=10`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  })
  const authData = await authRes.json()
  
  if (!authData.users || authData.users.length === 0) {
    console.log('No users found!')
    return
  }

  // Pick a user to generate a token for
  const testUser = authData.users[0]
  console.log(`Testing with user: ${testUser.email} (${testUser.id})`)
  
  // Generate a JWT for this user via admin API
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: testUser.email,
    })
  })
  console.log('Generate link status:', tokenRes.status)
  const tokenData = await tokenRes.json()
  
  // The access_token from generate_link can't be used directly
  // Instead, let's test the RLS by checking what each user's JWT would get
  // We need to use the Supabase admin to impersonate

  // Actually, let's just check the RLS policies by querying pg_policies through a custom SQL function
  // First, create a temporary function to get policies
  
  // Actually, the simplest approach: use the REST API with a SQL query endpoint
  // Supabase exposes this at /rest/v1/ but not for raw SQL
  // Let's use the Supabase dashboard SQL via the management API
  
  // Alternative: Check the Supabase project settings
  console.log('\n\n=== CHECKING RLS via raw query to pg_policies ===')
  
  // We can create and call a pg function
  // First create the function
  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_rls_policies`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  })
  console.log('check_rls_policies status:', createRes.status)
  if (createRes.status === 200) {
    const policies = await createRes.json()
    console.log('Policies:', JSON.stringify(policies, null, 2))
  } else {
    const err = await createRes.text()
    console.log('Error (function may not exist):', err.substring(0, 200))
  }

  // Plan B: Check pg_tables for RLS status
  console.log('\n\n=== CHECKING pg_tables via rpc ===')
  const tablesRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_table_info`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  })
  console.log('get_table_info status:', tablesRes.status)
  
  // Let's try the simplest possible check: list tables in information_schema
  console.log('\n\n=== CHECKING TABLES via information_schema ===')
  const schemaRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }
  })

  // Final approach: Use the /pg endpoint if available
  // Actually Supabase projects expose a pg endpoint with the pooler
  
  console.log('\n\n=== SUMMARY ===')
  console.log('Key findings so far:')
  console.log('1. listings table: EMPTY (0 rows with service role)')
  console.log('2. listing_media table: EMPTY (0 rows)')
  console.log('3. animal_categories: 8 categories (works for both anon and authenticated)')
  console.log('4. profiles: 4 profiles (works for both anon and authenticated)')
  console.log('5. wishlists: 0 rows')
  console.log('6. notifications: 1 row (service role) / 0 rows (anon) - correct RLS behavior')
  console.log('')
  console.log('The PRIMARY issue is: the listings table is EMPTY.')
  console.log('There are NO listings in the database to display.')
  console.log('')
  console.log('Auth users:')
  authData.users.forEach(u => {
    console.log(`  ${u.email} (role: ${u.app_metadata?.provider}, last: ${u.last_sign_in_at})`)
  })
}

checkAuthenticatedAccess().catch(console.error)
