'use client'

import { useState, useEffect, useRef } from 'react'
import { Globe, ChevronDown } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' }
]

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState('en')
  const dropdownRef = useRef(null)

  useEffect(() => {
    // Check if there's already a saved google translate cookie
    const cookies = document.cookie.split(';')
    const gtCookie = cookies.find(c => c.trim().startsWith('googtrans='))
    if (gtCookie) {
      const parts = gtCookie.split('/')
      if (parts.length > 2) {
        // format is typically /en/hi 
        const lang = parts[2]
        if (LANGUAGES.find(l => l.code === lang)) {
          setCurrentLang(lang)
        }
      }
    }

    // Close dropdown on outside click
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const switchLanguage = (langCode) => {
    setCurrentLang(langCode)
    setIsOpen(false)
    
    if (langCode === 'en') {
      // Clear cookie to revert to original
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + location.hostname + '; path=/;'
    } else {
      // Set google translation cookie: source/destination -> /en/hi
      document.cookie = `googtrans=/en/${langCode}; path=/`
      document.cookie = `googtrans=/en/${langCode}; domain=${location.hostname}; path=/`
    }
    
    // Force reload to apply Google Translate script
    window.location.reload()
  }

  const selectedLang = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0]

  return (
    <div className="relative z-50 text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
      >
        <Globe className="w-4 h-4 text-stone-400" />
        <span className="hidden sm:inline">{selectedLang.label}</span>
        <span className="sm:hidden font-semibold uppercase">{selectedLang.code}</span>
        <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-stone-100 overflow-hidden py-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                currentLang === lang.code 
                  ? 'bg-primary-50 text-primary-700 font-semibold' 
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
