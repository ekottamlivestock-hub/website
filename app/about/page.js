export const metadata = {
  title: 'About Us',
  description: 'Learn about ekottam, our mission to empower rural livestock farmers, and our platform connecting buyers and sellers directly.',
}

export default function AboutPage() {
  return (
    <div className="page-container max-w-4xl mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-stone-800 mb-4">About ekottam</h1>
        <p className="text-xl text-stone-500">Empowering India&apos;s Rural Livestock Economy</p>
      </div>

      <div className="prose prose-stone max-w-none">
        <div className="bg-primary-50 rounded-3xl p-8 mb-12 border border-primary-100">
          <h2 className="text-2xl font-bold text-primary-800 mt-0 mb-4">Our Mission</h2>
          <p className="text-primary-700 text-lg leading-relaxed mb-0">
            To build India&apos;s most trusted, transparent, and direct livestock marketplace, 
            eliminating middlemen and ensuring fair value for farmers while providing 
            quality assurance for buyers across the nation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <h3>The Problem</h3>
            <p>
              For decades, India&apos;s livestock trade has been dominated by fragmented local mandis and 
              multiple layers of middlemen. This traditional system often results in farmers receiving 
              significantly less than the market value for their animals, while buyers pay inflated 
              prices without any guarantee of the animal&apos;s health or breed authenticity.
            </p>
          </div>
          <div>
            <h3>The Solution</h3>
            <p>
              ekottam bridges the gap between rural sellers and buyers across 28 states. 
              By leveraging technology, we provide a transparent platform where farmers can list their 
              livestock directly. We incorporate verification protocols, secure payments, and logistics 
              support to make livestock trading as easy as buying a product online.
            </p>
          </div>
        </div>

        <h3 className="text-center mb-8">What Sets Us Apart</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm text-center">
            <div className="text-3xl mb-3">🛡️</div>
            <h4 className="font-bold text-stone-800 mb-2">Verified Network</h4>
            <p className="text-sm text-stone-500">Every seller undergoes KYC verification to ensure genuine transactions.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm text-center">
            <div className="text-3xl mb-3">💰</div>
            <h4 className="font-bold text-stone-800 mb-2">Zero Commission</h4>
            <p className="text-sm text-stone-500">Farmers keep 100% of their negotiated price. We don&apos;t take a cut from the sale.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm text-center">
            <div className="text-3xl mb-3">🏥</div>
            <h4 className="font-bold text-stone-800 mb-2">Health First</h4>
            <p className="text-sm text-stone-500">Emphasis on vaccination records and health certifications for better breed quality.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
