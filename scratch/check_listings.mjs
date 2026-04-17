const SUPABASE_URL = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'

async function checkListings() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/listings?select=*`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  
  const data = await res.json();
  console.log(`Found ${data.length} listings`);
  if (data.length > 0) {
    console.log(data[0]);
  }
}

checkListings().catch(console.error);
