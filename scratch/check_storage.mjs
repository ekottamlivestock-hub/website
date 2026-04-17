// import removed

const SUPABASE_URL = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'

async function checkStorage() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  
  const status = res.status;
  const buckets = await res.json();
  console.log(`Buckets check status: ${status}`);
  console.log(JSON.stringify(buckets, null, 2));
}

checkStorage().catch(console.error);
