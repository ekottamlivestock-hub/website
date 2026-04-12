import './globals.css'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
  title: {
    default: 'ekottam — India\'s Trusted Animal Marketplace',
    template: '%s | ekottam',
  },
  description: 'Buy and sell livestock across India. Cows, hens, goats, buffaloes, sheep, and more. Verified sellers, safe transactions, direct trading without middlemen.',
  keywords: ['livestock', 'animal marketplace', 'buy cattle', 'sell animals', 'farming', 'Indian livestock'],
  authors: [{ name: 'ekottam' }],
  openGraph: {
    title: 'ekottam — India\'s Trusted Animal Marketplace',
    description: 'Pan-India platform to buy and sell all kinds of livestock.',
    url: 'https://ekottam.vercel.app',
    siteName: 'ekottam',
    type: 'website',
    images: ['/images/1.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ekottam — India\'s Trusted Animal Marketplace',
    description: 'Pan-India platform to buy and sell all kinds of livestock.',
    images: ['/images/1.jpg'],
  },
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <Navbar />
        <main className="flex-1 pt-16">
          {children}
        </main>
        <Footer />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            className: 'toast-custom',
            style: {
              background: '#1c1917',
              color: '#fafaf9',
              borderRadius: '1rem',
              padding: '12px 16px',
              fontSize: '0.875rem',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            success: {
              iconTheme: { primary: '#16a34a', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
        
        {/* Hidden internal google translate element */}
        <div id="google_translate_element"></div>
        <Script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" strategy="afterInteractive" />
        <Script id="google-translate-config" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,hi,te',
                autoDisplay: false,
              }, 'google_translate_element');
            }
          `}
        </Script>
      </body>
    </html>
  )
}
