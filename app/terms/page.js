export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service and platform rules for using ekottam livestock marketplace.',
}

export default function TermsPage() {
  return (
    <div className="page-container max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-stone-800 mb-8">Terms of Service</h1>
      
      <div className="prose prose-stone max-w-none text-stone-600">
        <p className="text-sm text-stone-400 mb-8">Last Updated: April 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using ekottam (the &quot;Platform&quot;), you agree to be bound by these Terms of Service. 
          If you do not agree to these terms, please do not use our services.
        </p>

        <h2>2. User Registration & KYC</h2>
        <p>
          To access certain features, especially selling livestock, users must register and complete the 
          Know Your Customer (KYC) process. Users are responsible for maintaining the confidentiality 
          of their account credentials and providing accurate, current information.
        </p>

        <h2>3. Listing Rules</h2>
        <ul>
          <li>All listed livestock must legally belong to the seller.</li>
          <li>Listings must accurately describe the animal&apos;s breed, age, health status, and price.</li>
          <li>Using false images or misleading descriptions will result in immediate account suspension.</li>
          <li>Selling of illegal, endangered, or prohibited wildlife is strictly forbidden.</li>
        </ul>

        <h2>4. Transactions & Payments</h2>
        <p>
          ekottam acts as a marketplace connecting buyers and sellers. While we facilitate the connection, 
          the actual contract of sale is directly between the buyer and seller. ekottam is not liable for 
          payment defaults, disputes, or transportation injuries unless explicitly covered under our 
          logistics guarantee program.
        </p>

        <h2>5. Health & Cruelty Policy</h2>
        <p>
          We maintain a zero-tolerance policy towards animal cruelty. Any user found trading sick, injured, 
          or illegally transported animals will be banned and reported to relevant animal welfare authorities.
        </p>

        <h2>6. Dispute Resolution</h2>
        <p>
          Any disputes arising from transactions should first be attempted to be resolved amicably between 
          the buyer and seller. ekottam may assist in mediation but holds no legal liability for dispute outcomes.
        </p>

        <div className="mt-12 p-6 bg-stone-50 rounded-2xl border border-stone-200">
          <p className="mb-0 text-sm font-medium">
            For legal inquiries, contact our grievance officer at <a href="mailto:legal@ekottam.in" className="text-primary-600 hover:underline">legal@ekottam.in</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
