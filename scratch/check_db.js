import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ojtlfiigxyawivpgecyr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdGxmaWlneHlhd2l2cGdlY3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3MzM2NiwiZXhwIjoyMDkxNTQ5MzY2fQ.Ok0XwZ998mckwJ8iK_QpKY-qSeDMhgF6qv9Hyx_6ID8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase
    .from('listings')
    .select(`*, profiles(full_name, avatar_url), animal_categories(name), listing_media(url, sort_order)`)
    .limit(1)

  console.log('Error:', error)
  if (data) console.log('Data OK')
}

check()
