const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ojtlfiigxyawivpgecyr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzMzNjYsImV4cCI6MjA5MTU0OTM2Nn0.OeC9Ki5f7VRG9lwyEE4GKQwLBNv0BclkXGzPsSR5T-c';

async function testAdminFetch() {
  const adminClient = createClient(URL, SERVICE_KEY);

  // 1. Get an Admin User
  const { data: users, error: userError } = await adminClient.from('profiles').select('id, full_name').eq('role', 'admin');
  if (userError || !users.length) {
    console.error("Failed to find admin:", userError);
    return;
  }
  const adminId = users[0].id;
  console.log("Found Admin:", users[0].full_name, adminId);

  // 2. We can't generate a token easily without the secret, BUT we can generate a magic link 
  // via admin API and parse it!
  // Wait, if it sends an email, we can't intercept it unless we use a fake email.
  
  // Alternative: Can we impersonate using service key?
  // We can't impersonate a JWT directly, BUT we can use Postgres's `set_config` via RPC!
  // Since we don't want to modify the DB by adding an RPC, let's explore if there's any other way.
  // Wait... the Edge Functions can do it.

  // Let's create a temporary table/RPC to run the query
  const rpcQuery = `
    CREATE OR REPLACE FUNCTION dev_simulate_admin_fetch(test_uid UUID)
    RETURNS jsonb AS $$
    DECLARE
      res jsonb;
    BEGIN
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', format('{"sub":"%s", "role":"authenticated"}', test_uid), true);
      
      SELECT jsonb_agg(data) INTO res FROM (
        SELECT l.*, 
               (SELECT row_to_json(ac.*) FROM animal_categories ac WHERE ac.id = l.category_id) as animal_categories,
               (SELECT row_to_json(p.*) FROM profiles p WHERE p.id = l.seller_id) as profiles
        FROM listings l
        WHERE l.status = 'approved'
        ORDER BY l.created_at DESC
        LIMIT 8
      ) data;
      
      RETURN res;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  console.log("We need to run this RPC via SQL editor to test it.");
}

testAdminFetch();
