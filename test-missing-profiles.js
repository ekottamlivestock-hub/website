const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ojtlfiigxyawivpgecyr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8';

async function checkMissingProfiles() {
  const adminClient = createClient(URL, SERVICE_KEY);
  
  const { data: users, error: authErr } = await adminClient.auth.admin.listUsers();
  if (authErr) return console.error(authErr);
  
  const { data: profiles, error: profErr } = await adminClient.from('profiles').select('id');
  if (profErr) return console.error(profErr);
  
  const profileIds = new Set(profiles.map(p => p.id));
  const missing = users.users.filter(u => !profileIds.has(u.id));
  
  console.log("Missing profiles for auth users:", missing.length);
  if (missing.length > 0) {
    missing.forEach(u => console.log(u.email));
  }
}

checkMissingProfiles();
