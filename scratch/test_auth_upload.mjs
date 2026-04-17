// Test upload as authenticated user
const SUPABASE_URL = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'

async function testAuthUpload() {
  // First, generate an auth token for token
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  })
  const authData = await authRes.json()
  const testUser = authData.users[0]
  
  console.log(`Testing with user: ${testUser.email} (${testUser.id})`)
  
  // Create a token to simulate the user. Since we can't easily impersonate via REST without getting access_token,
  // we can use a raw SQL query via standard REST (Wait, Supabase REST evaluates RLS immediately and would return 403)
  
  // Instead of full JWT, we can test insert to storage.objects using the Anon Key
  // Actually, without the valid JWT, we can't fully replicate the browser upload.
  // But wait! Supabase allows uploads to public buckets if RLS allows anon.
  // What if RLS is broken and blocking EVERYTHING so it times out?
  // Let's check the policies on storage.objects via REST, bypassing RLS.
  
  const policiesRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });

  // Let's do a curl to list policies roughly by inspecting pg_policies if possible.
  // We can also query storage.objects just to see if we can read it.
  const objRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/listing-media`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prefix: '',
      limit: 10,
      offset: 0,
      sortBy: {
        column: 'name',
        order: 'asc'
      }
    })
  });
  
  console.log(`List objects status: ${objRes.status}`);
  const objData = await objRes.json();
  console.log(objData);
}

testAuthUpload().catch(console.error);
