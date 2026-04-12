import React from 'react'

export default function KottamLogo({ className = "w-6 h-6 text-primary-600" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Broad triangle roof */}
      <path d="M2 11L12 2l10 9" />
      {/* Structural pillars / walls of the shed */}
      <path d="M4 11l1 11h14l1-11" />
      {/* Horizontal beam */}
      <path d="M2 11h20" />
      {/* Inner gate / structure */}
      <path d="M9 22V14h6v8" />
    </svg>
  )
}
