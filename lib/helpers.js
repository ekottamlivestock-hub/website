import { supabase } from './supabase'

/**
 * Format price in Indian Rupee format
 * @param {number} num - The price to format
 * @returns {string} - Formatted price like ₹1,25,000
 */
export function formatPrice(num) {
  if (!num && num !== 0) return '₹0'
  return '₹' + Number(num).toLocaleString('en-IN')
}

/**
 * Format age with unit
 * @param {number} value - Age value
 * @param {string} unit - Age unit (days/months/years)
 * @returns {string} - Formatted age like "2 years"
 */
export function formatAge(value, unit) {
  if (!value || !unit) return 'N/A'
  return `${value} ${unit}`
}

/**
 * Get Tailwind color classes for listing status
 * @param {string} status - Listing status
 * @returns {object} - { bg, text, dot } classes
 */
export function getStatusColor(status) {
  const colors = {
    draft: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' },
    pending_review: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
    sold: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
    paused: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
    open: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    dismissed: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' },
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
    shipped: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
    delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
    paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    unpaid: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    refunded: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' },
  }
  return colors[status] || colors.draft
}

/**
 * Get notification color by type
 * @param {string} type - Notification type
 * @returns {string} - Tailwind color class
 */
export function getNotificationColor(type) {
  if (type?.includes('approved') || type?.includes('delivered')) return 'text-emerald-600'
  if (type?.includes('rejected')) return 'text-red-600'
  if (type?.includes('order') || type?.includes('shipped')) return 'text-blue-600'
  if (type?.includes('pending') || type?.includes('new_')) return 'text-amber-600'
  return 'text-stone-600'
}

/**
 * Generate URL-safe slug from text
 * @param {string} text - Text to slugify
 * @returns {string} - URL-safe slug
 */
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/**
 * Truncate text to max length
 * @param {string} text - Text to truncate
 * @param {number} max - Max character count
 * @returns {string} - Truncated text
 */
export function truncate(text, max = 100) {
  if (!text) return ''
  if (text.length <= max) return text
  return text.substring(0, max).trim() + '...'
}

/**
 * Send in-app notification to a user
 * @param {string} userId - Target user ID
 * @param {string} type - Notification type
 * @param {string} message - Notification message
 * @param {object} metadata - Additional JSON metadata
 */
export async function sendNotification(userId, type, message, metadata = {}) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        message,
        metadata,
        is_read: false,
      })
    if (error) console.error('Notification send error:', error)
  } catch (err) {
    console.error('Failed to send notification:', err)
  }
}

/**
 * Get category emoji fallback icon
 * @param {string} slug - Category slug
 * @returns {string} - Emoji icon
 */
export function getCategoryEmoji(slug) {
  const emojis = {
    cow: '🐄',
    hen: '🐔',
    goat: '🐐',
    buffalo: '🐃',
    sheep: '🐑',
    pig: '🐖',
    dog: '🐕',
    fish: '🐟',
    horse: '🐎',
    camel: '🐪',
    rabbit: '🐇',
    duck: '🦆',
  }
  return emojis[slug] || '🐾'
}

/**
 * Format relative time
 * @param {string} dateStr - ISO date string
 * @returns {string} - Relative time like "2 hours ago"
 */
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ]

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`
    }
  }
  return 'Just now'
}

/**
 * Format date to readable format
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted date like "12 Apr 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Indian states list
 */
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

/**
 * Common vaccination tags
 */
export const VACCINATION_TAGS = [
  'FMD', 'Brucella', 'Anthrax', 'Black Quarter', 'Hemorrhagic Septicemia',
  'PPR', 'Goat Pox', 'Ranikhet', 'Marek\'s', 'IBD',
  'Dewormed', 'Fully Vaccinated', 'Partially Vaccinated',
]

// Central company contact. All buyer enquiries are routed through ekottam —
// seller phone numbers are never exposed directly to buyers.
export const COMPANY_CONTACT = {
  phoneDisplay: '+91 90108 81947',
  phoneTel: '+919010881947',
  whatsappNumber: '919010881947',
  whatsappUrl: 'https://wa.me/919010881947',
  email: 'info@ekottam.in',
  address: {
    line1: 'H.No: 1-1-10, RAM Laxmi Arcade',
    line2: 'Habsiguda, Pillar No: 982',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500007',
    // Google Maps landmark — opens directly at the storefront coordinates.
    mapUrl: 'https://www.google.com/maps?q=17.418437,78.5417781',
  },
}

export function buildListingEnquiryWhatsApp(listing) {
  const title = listing?.title || 'a listing'
  const id = listing?.id ? ` (ID: ${listing.id})` : ''
  const message = `Hi ekottam, I'm interested in "${title}"${id}. Please share more details.`
  return `${COMPANY_CONTACT.whatsappUrl}?text=${encodeURIComponent(message)}`
}
