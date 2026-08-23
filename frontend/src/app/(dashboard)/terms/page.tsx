"use client";
import React from "react";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-8 bg-white rounded-2xl shadow-sm border border-slate-200 mt-6">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
          <FileText className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Terms of Service</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing and using the LastMile Logistics platform, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2">2. Delivery Agent Responsibilities</h2>
          <p>
            Delivery agents must ensure their GPS tracking is active when marked as "AVAILABLE" or "BUSY". 
            Agents are responsible for the safe and timely delivery of assigned packages. Repeated delivery failures 
            or artificial manipulation of location data may result in account suspension.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2">3. Rates and Billing</h2>
          <p>
            All delivery charges are calculated dynamically based on active Rate Cards defined by System Administrators. 
            Customers are responsible for providing accurate package dimensions and weights; discrepancies may result in 
            post-delivery adjustments to the billable amount.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2">4. Limitation of Liability</h2>
          <p>
            LastMile Logistics is not liable for indirect, incidental, or consequential damages resulting from delayed 
            deliveries, incorrect addresses provided by customers, or acts of God (force majeure) that disrupt the 
            supply chain.
          </p>
        </section>
      </div>
    </div>
  );
}
