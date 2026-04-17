// Check actual RLS policies using Supabase SQL endpoint
const SUPABASE_URL = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'

async function checkPolicies() {
  // Query pg_policies view to get all RLS policies
  const sql = `
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }
  })
  
  // pg_policies isn't accessible via RPC, let's try going through the management API
  // Actually, let's check via the SQL editor endpoint
  
  // Method: Use Supabase's postgREST to query information_schema
  // First check if RLS is enabled on each table
  const tablesRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }
  })

  // Let's create a function to run raw SQL
  // First, let's create an RPC function
  const createFuncRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ query: "SELECT tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public'" })
  })
  
  console.log('exec_sql status:', createFuncRes.status)
  const funcResult = await createFuncRes.text()
  console.log('exec_sql result:', funcResult)
  
  // Alternative: Check RLS enabled via pg_class
  console.log('\n\n===== CHECKING RLS STATUS VIA ALTERNATE METHOD =====')
  
  // Use the Supabase management API approach - just test what happens
  // with an authenticated token vs anon on each table
  
  // Get all profiles to find a real user ID
  const profilesRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,role`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  })
  const profiles = await profilesRes.json()
  console.log('\nProfiles in database:')
  profiles.forEach(p => console.log(`  ${p.id} - ${p.full_name} (${p.role})`))
  
  // Try to check if there are any auth.users
  console.log('\n\n===== CHECKING AUTH USERS =====')
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=10`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  })
  console.log('Auth users status:', authRes.status)
  const authData = await authRes.json()
  if (authData.users) {
    console.log(`Total auth users: ${authData.users.length}`)
    authData.users.forEach(u => {
      console.log(`  ${u.id} - ${u.email} - provider: ${u.app_metadata?.provider || 'unknown'}`)
      console.log(`    created: ${u.created_at}`)
      console.log(`    last_sign_in: ${u.last_sign_in_at}`)
    })
  } else {
    console.log('Auth response:', JSON.stringify(authData).substring(0, 500))
  }

  // Check the table structure and constraints
  console.log('\n\n===== CHECKING TABLE RLS + FOREIGN KEYS =====')
  
  // Check if there's a handle_new_user trigger
  const triggerCheck = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: "SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers WHERE trigger_schema = 'public'" })
  })
  console.log('Triggers check status:', triggerCheck.status)
  const triggerData = await triggerCheck.text()
  console.log('Triggers:', triggerData)
}

checkPolicies().catch(console.error)
