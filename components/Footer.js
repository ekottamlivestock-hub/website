'use client'

import Link from 'next/link'
import { Phone, Mail, MapPin } from 'lucide-react'
import KottamLogo from './KottamLogo'
import { COMPANY_CONTACT } from '@/lib/helpers'

const WhatsAppIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
)

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-surface-ink text-surface-200 mt-20">
      {/* Soft radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(93,154,106,0.18),transparent_70%)]" />

      <div className="relative">
        {/* Editorial headline band */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-24 items-start">
            <div>
              <span className="eyebrow text-secondary-300">Let&rsquo;s build the market</span>
              <h2 className="mt-4 font-display text-display-xl text-white text-balance">
                Raised with care.<br />
                <span className="italic text-secondary-300">Sold with trust.</span>
              </h2>
              <p className="mt-6 max-w-lg text-surface-300 leading-relaxed">
                ekottam is a pan-India platform connecting farmers and buyers directly.
                No middlemen, no hidden commissions &mdash; just honest livestock trading.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={COMPANY_CONTACT.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-primary-500 text-white
                    rounded-full text-sm font-semibold hover:bg-primary-400 transition-all shadow-lift"
                >
                  <WhatsAppIcon className="w-4 h-4" /> Chat on WhatsApp
                </a>
                <a
                  href={`tel:${COMPANY_CONTACT.phoneTel}`}
                  className="inline-flex items-center gap-2 px-5 py-3 border border-surface-200/30
                    text-white rounded-full text-sm font-semibold hover:bg-white/5 transition-all"
                >
                  <Phone className="w-4 h-4" /> {COMPANY_CONTACT.phoneDisplay}
                </a>
              </div>
            </div>

            {/* Address card */}
            <address className="not-italic">
              <span className="eyebrow text-secondary-300">Registered office</span>
              <a
                href={COMPANY_CONTACT.address.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex gap-4 items-start p-6 rounded-2xl border border-surface-200/15
                  bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] hover:border-surface-200/25
                  transition-all group"
              >
                <span className="shrink-0 w-10 h-10 rounded-full bg-primary-500/15 flex items-center justify-center text-primary-300
                  group-hover:bg-primary-500/25 transition-colors">
                  <MapPin className="w-4 h-4" />
                </span>
                <span className="text-sm leading-relaxed text-surface-200">
                  {COMPANY_CONTACT.address.line1}<br />
                  {COMPANY_CONTACT.address.line2}<br />
                  {COMPANY_CONTACT.address.city}, {COMPANY_CONTACT.address.state} {COMPANY_CONTACT.address.pincode}
                  <span className="block mt-2 text-[11px] font-semibold uppercase tracking-widest text-secondary-300">
                    Open on Google Maps →
                  </span>
                </span>
              </a>
            </address>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-surface-200/15 to-transparent" />

        {/* Link columns */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <KottamLogo className="w-7 h-7 text-primary-400" />
              <span className="font-display text-xl">ekottam</span>
            </Link>
            <p className="mt-4 text-[13px] text-surface-400 leading-relaxed">
              India&apos;s trusted livestock marketplace.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={`mailto:${COMPANY_CONTACT.email}`}
                aria-label="Email"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-surface-300"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href={COMPANY_CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-green-500 flex items-center justify-center text-surface-300 hover:text-white transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold text-surface-400 uppercase tracking-widest mb-4">Marketplace</h4>
            <ul className="space-y-2.5 text-sm text-surface-200">
              <li><Link href="/listings" className="hover:text-white transition-colors">Browse Listings</Link></li>
              <li><Link href="/sell" className="hover:text-white transition-colors">Sell Animals</Link></li>
              <li><Link href="/seller/apply" className="hover:text-white transition-colors">Become a Seller</Link></li>
              <li><Link href="/listings?category=cow" className="hover:text-white transition-colors">Buy Cattle</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold text-surface-400 uppercase tracking-widest mb-4">Ekottam</h4>
            <ul className="space-y-2.5 text-sm text-surface-200">
              <li><Link href="/#how-it-works" className="hover:text-white transition-colors">How it works</Link></li>
              <li><Link href="/#why" className="hover:text-white transition-colors">Why ekottam</Link></li>
              <li><Link href="/#schemes" className="hover:text-white transition-colors">Government schemes</Link></li>
              <li><Link href="/#testimonials" className="hover:text-white transition-colors">Stories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold text-surface-400 uppercase tracking-widest mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-surface-200">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/refund" className="hover:text-white transition-colors">Refunds</Link></li>
              <li><Link href="/fraud-prevention" className="hover:text-white transition-colors">Fraud prevention</Link></li>
            </ul>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-surface-200/15 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-surface-400">
            © {new Date().getFullYear()} Ekottam (National Livestock) · Crafted in India 🇮🇳
          </p>
          <p className="text-[11px] text-surface-500 font-mono tracking-wider uppercase">
            v2 · ekottam.in
          </p>
        </div>
      </div>

      {/* Floating WhatsApp */}
      <a
        href={COMPANY_CONTACT.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 bg-green-500 text-white rounded-full
          flex items-center justify-center shadow-float hover:bg-green-600
          hover:scale-105 transition-all duration-300"
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className="w-6 h-6" />
      </a>
    </footer>
  )
}
