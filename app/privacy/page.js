export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy and data protection guidelines for ekottam users.',
}

export default function PrivacyPage() {
  return (
    <div className="page-container max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-stone-800 mb-8">Privacy Policy</h1>
      
      <div className="prose prose-stone max-w-none text-stone-600">
        <p className="text-sm text-stone-400 mb-8">This Privacy Policy governs how ekottam collects, uses, and protects your information.</p>

        <h2>1. Information We Collect</h2>
        <p>We may collect the following types of information when you use our platform:</p>
        <ul>
          <li><strong>Personal Information:</strong> Name, phone number, email address, physical address.</li>
          <li><strong>Verification Data:</strong> ID proofs (Aadhaar, PAN, Voter ID) required for seller KYC.</li>
          <li><strong>Usage Data:</strong> How you interact with the app, device information, IP address.</li>
          <li><strong>Transaction Data:</strong> Payment history, order details, and account balances.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>Your information is used to:</p>
        <ul>
          <li>Verify your identity and maintain a trusted marketplace.</li>
          <li>Facilitate communication between buyers and sellers.</li>
          <li>Process transactions and arrange logistics.</li>
          <li>Send administrative notifications, platform updates, and marketing communications (which you can opt out of).</li>
        </ul>

        <h2>3. Data Sharing & Security</h2>
        <p>
          We do not sell your personal data to third parties. We only share necessary details 
          (like phone number and address) between the buyer and seller after an order is initiated. 
          Your KYC documents are stored securely using industry-standard encryption protocols.
        </p>

        <h2>4. Your Rights</h2>
        <p>
          You have the right to access, modify, or request the deletion of your personal data. 
          You can manage your data through your Profile settings or by contacting our support team.
        </p>

        <div className="mt-12 p-6 bg-stone-50 rounded-2xl border border-stone-200">
          <p className="mb-0 text-sm">
            If you have questions about our privacy practices, please email <a href="mailto:privacy@ekottam.in" className="text-primary-600 hover:underline">privacy@ekottam.in</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
