export const metadata = {
  title: 'Fraud Prevention',
  description: 'Guidelines to stay safe and prevent fraud on ekottam.',
}

export default function FraudPreventionPage() {
  return (
    <div className="page-container max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-stone-800 mb-8">Fraud Prevention Guidelines</h1>
      
      <div className="prose prose-stone max-w-none text-stone-600">
        <p className="text-sm text-stone-400 mb-8">Your safety is our priority. Please follow these guidelines to protect yourself from fraudulent activities while using ekottam.</p>

        <h2>1. Keep Transactions on the Platform</h2>
        <p>Do not arrange payments outside of ekottam. Our secure system ensures fairness for both buyers and sellers.</p>
        
        <h2>2. Beware of Unrealistic Prices</h2>
        <p>If an offer seems too good to be true, it likely is. Cross-reference the asking price with average market rates.</p>

        <h2>3. Verify Seller Identity</h2>
        <p>Ensure you are dealing with a KYC-verified seller. Look for the &quot;Verified&quot; badge on their profile and listing. Do not trust sellers who refuse to share additional photos or video calls.</p>

        <h2>4. Report Suspicious Activity</h2>
        <p>If a seller insists on advance payments via UPI external to our procedures or asks for OTPs, immediately stop communicating and report them.</p>

        <div className="mt-12 p-6 bg-stone-50 rounded-2xl border border-stone-200">
          <p className="mb-0 text-sm">
            If you suspect fraud, immediately notify us at <a href="mailto:fraud-alert@ekottam.in" className="text-primary-600 hover:underline">fraud-alert@ekottam.in</a> or alert us via the platform.
          </p>
        </div>
      </div>
    </div>
  )
}
