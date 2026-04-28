import { supabase } from './supabase'

// Bulk-cleanup helpers for the listing-media bucket. We can't run storage
// deletes from a Postgres trigger without an edge function, so the client
// is responsible for cleaning storage in the same transaction-shaped flow
// it uses to delete listing rows. Anything that escapes (e.g. an admin
// deleting a row directly in the Supabase dashboard) becomes an orphan
// file — that's the known limitation of this approach.

/**
 * Convert a public-URL stored in listing_media.url back to the storage
 * key understood by `supabase.storage.from(bucket).remove([...])`.
 *
 * Public URLs look like:
 *   https://<project>.supabase.co/storage/v1/object/public/listing-media/<userid>/<file>.jpg
 * We want the part AFTER `/<bucket>/` — the storage SDK takes that as
 * the "path" argument.
 */
export function pathFromPublicUrl(url, bucket = 'listing-media') {
  if (!url || typeof url !== 'string') return null
  const marker = `/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

/**
 * Remove a list of files from a public bucket. Tolerates per-file errors
 * (logs them and keeps going) so a stray missing file doesn't block the
 * caller's main flow.
 */
export async function removeFromBucket(bucket, paths) {
  const cleaned = paths.filter(Boolean)
  if (cleaned.length === 0) return { removed: 0 }
  const { error } = await supabase.storage.from(bucket).remove(cleaned)
  if (error) {
    console.error(`storage cleanup (${bucket}) failed:`, error)
    return { removed: 0, error }
  }
  return { removed: cleaned.length }
}

/**
 * Delete every storage file referenced by a listing's media rows.
 * Used right before deleting the listing itself so we don't leak files.
 */
export async function deleteListingStorage(listingId) {
  const { data: media } = await supabase
    .from('listing_media')
    .select('url')
    .eq('listing_id', listingId)
  if (!media || media.length === 0) return { removed: 0 }
  const paths = media
    .map(m => pathFromPublicUrl(m.url, 'listing-media'))
    .filter(Boolean)
  return removeFromBucket('listing-media', paths)
}

/**
 * Diff the listing's current media URLs (kept after edit) against what's
 * still in the DB and delete the storage files for the ones that were
 * dropped. Call this right before the edit-page UPDATE step.
 */
export async function cleanupRemovedListingMedia(listingId, keptUrls) {
  const { data: existing } = await supabase
    .from('listing_media')
    .select('url')
    .eq('listing_id', listingId)
  if (!existing || existing.length === 0) return { removed: 0 }
  const kept = new Set(keptUrls || [])
  const dropped = existing
    .map(m => m.url)
    .filter(url => !kept.has(url))
    .map(url => pathFromPublicUrl(url, 'listing-media'))
    .filter(Boolean)
  return removeFromBucket('listing-media', dropped)
}
