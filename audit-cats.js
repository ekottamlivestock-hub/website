const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ojtlfiigxyawivpgecyr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8';

async function checkCats() {
  const adminClient = createClient(URL, SERVICE_KEY);
  
  const { data: cats } = await adminClient.from('animal_categories').select('*');
  console.log("Categories Audit:");
  console.log(JSON.stringify(cats, null, 2));
}

checkCats();
