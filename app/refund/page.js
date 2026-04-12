export const metadata = {
  title: 'Refund Policy',
  description: 'Refund and cancellation guidelines for ekottam users.',
}

export default function RefundPage() {
  return (
    <div className="page-container max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-stone-800 mb-8">Refund Policy</h1>
      
      <div className="prose prose-stone max-w-none text-stone-600">
        <p className="text-sm text-stone-400 mb-8">This Refund Policy outlines the terms and conditions for refunds and cancellations on the ekottam platform.</p>

        <h2>1. Order Cancellation</h2>
        <p>Orders can be cancelled by the buyer before the seller accepts and processes the shipment. Once an order is in transit, cancellation may not be possible.</p>
        
        <h2>2. Refund Eligibility</h2>
        <p>Refunds are applicable under the following circumstances:</p>
        <ul>
          <li>The animal delivered significantly differs from the health or breed described in the listing.</li>
          <li>The seller fails to deliver the animal within the agreed timeframe.</li>
          <li>The animal is found to be unhealthy or diseased immediately upon delivery (veterinary certificate required).</li>
        </ul>

        <h2>3. Processing Refunds</h2>
        <p>
          Approved refunds will be processed within 5-7 business days and credited back to the original payment method used during the transaction. 
        </p>

        <div className="mt-12 p-6 bg-stone-50 rounded-2xl border border-stone-200">
          <p className="mb-0 text-sm">
            For refund requests or concerns, please contact our support team at <a href="mailto:support@ekottam.in" className="text-primary-600 hover:underline">support@ekottam.in</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
