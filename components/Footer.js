'use client'

import Link from 'next/link'
import { Phone, Mail, Globe, MapPin, MessageCircle } from 'lucide-react'
import KottamLogo from './KottamLogo'

const WhatsAppIcon = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
)

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      {/* Contact Strip */}
      <div className="border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="tel:+919391609598" className="flex items-center gap-2 hover:text-primary-400 transition-colors">
              <Phone className="w-4 h-4" /> +91 93916 09598
            </a>
            <a href="mailto:info@ekottam.in" className="flex items-center gap-2 hover:text-primary-400 transition-colors">
              <Mail className="w-4 h-4" /> info@ekottam.in
            </a>
            <a href="https://ekottam.vercel.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary-400 transition-colors">
              <Globe className="w-4 h-4" /> ekottam.vercel.app
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block group">
              <div className="flex items-center gap-2 mb-1">
                <KottamLogo className="w-8 h-8 text-primary-400 group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-2xl font-black text-primary-400 tracking-tighter leading-none">EKOTTAM</span>
              </div>
            </Link>
            <p className="mt-3 text-sm text-stone-400 leading-relaxed">
              Pan-India platform to buy and sell all kinds of livestock. 
              Empowering rural entrepreneurs through technology.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="https://wa.me/919391609598" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center bg-stone-800 rounded-full 
                  hover:bg-green-600 transition-all text-stone-400 hover:text-white">
                <WhatsAppIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <div className="space-y-3">
              <Link href="/listings" className="block text-sm hover:text-primary-400 transition-colors">Browse Listings</Link>
              <Link href="/sell" className="block text-sm hover:text-primary-400 transition-colors">Sell Your Animals</Link>
              <Link href="/seller/apply" className="block text-sm hover:text-primary-400 transition-colors">Become a Seller</Link>
              <Link href="/listings?category=cow" className="block text-sm hover:text-primary-400 transition-colors">Buy Cattle</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Support</h4>
            <div className="space-y-3">
              <Link href="/#how-it-works" className="block text-sm hover:text-primary-400 transition-colors">How It Works</Link>
              <Link href="/#why" className="block text-sm hover:text-primary-400 transition-colors">Why ekottam</Link>
              <Link href="/#schemes" className="block text-sm hover:text-primary-400 transition-colors">Government Schemes</Link>
              <Link href="/#testimonials" className="block text-sm hover:text-primary-400 transition-colors">Success Stories</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
            <div className="space-y-3">
              <Link href="/terms" className="block text-sm hover:text-primary-400 transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="block text-sm hover:text-primary-400 transition-colors">Privacy Policy</Link>
              <Link href="/refund" className="block text-sm hover:text-primary-400 transition-colors">Refund Policy</Link>
              <Link href="/fraud-prevention" className="block text-sm hover:text-primary-400 transition-colors">Fraud Prevention</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-stone-500">
              © {new Date().getFullYear()} Ekottam (National Livestock). All Rights Reserved.
            </p>
            <div className="flex items-center gap-1 text-xs text-stone-600">
              <MapPin className="w-3 h-3" /> Made in India 🇮🇳
            </div>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/919391609598"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 text-white rounded-full 
          flex items-center justify-center shadow-lg shadow-green-500/30 hover:bg-green-600 
          hover:scale-110 transition-all duration-300"
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className="w-6 h-6" />
      </a>
    </footer>
  )
}
