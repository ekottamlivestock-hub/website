const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ojtlfiigxyawivpgecyr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8';

async function auditData() {
  const adminClient = createClient(URL, SERVICE_KEY);

  // Check listings statuses
  const { data: listings, error } = await adminClient.from('listings').select('id, status, title');
  if (error) return console.error(error);
  
  console.log("Listing Status Audit:");
  const counts = {};
  listings.forEach(l => {
    counts[l.status] = (counts[l.status] || 0) + 1;
  });
  console.log(JSON.stringify(counts, null, 2));

  // Check if any listing has a missing category or seller
  const { data: broken } = await adminClient.from('listings').select('id, category_id, seller_id').is('category_id', null);
  console.log("Listings with null category:", broken?.length || 0);

  // Check specifically for 'approved' (lowercase)
  const approved = listings.filter(l => l.status === 'approved');
  if (approved.length > 0) {
    console.log("First approved listing ID:", approved[0].id);
  } else {
    console.log("WARNING: No listings found with status 'approved'!");
  }
}

auditData();
