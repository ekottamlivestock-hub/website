const SUPABASE_URL = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'

async function testUpload() {
  const content = 'Test image content';
  
  // Upload with service key (bypasses RLS)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/listing-media/test-image.txt`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'text/plain'
    },
    body: content
  });
  
  console.log(`Service Role upload status: ${res.status}`);
  const data = await res.json();
  console.log(data);
  
  // Then we can delete it
  await fetch(`${SUPABASE_URL}/storage/v1/object/listing-media/test-image.txt`, {
    method: 'DELETE',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
}

testUpload().catch(console.error);
