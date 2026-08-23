"use client";
import React from "react";
import { ShieldAlert } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-8 bg-white rounded-2xl shadow-sm border border-slate-200 mt-6">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
          <ShieldAlert className="w-8 h-8 text-[#0033a0]" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2">1. Data Collection</h2>
          <p>
            LastMile Logistics collects information necessary to facilitate delivery orchestration. This includes 
            user profile information, real-time GPS location of delivery agents (only when marked as AVAILABLE or BUSY), 
            and customer contact information for delivery updates.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2">2. Data Usage</h2>
          <p>
            Your data is solely used for logistics operations. Location data is strictly used by our Smart Dispatch 
            Algorithm to assign the nearest delivery agents and prevent workload hotspots. We do not sell your data 
            to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2">3. Security</h2>
          <p>
            All data is secured using enterprise-grade encryption both in transit and at rest. Access to the administrative 
            dashboard is protected by role-based access control (RBAC).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2">4. User Rights</h2>
          <p>
            You have the right to request the deletion of your account and associated personal data by contacting 
            our support team. Please note that certain delivery logs must be retained for compliance and auditing purposes.
          </p>
        </section>
      </div>
    </div>
  );
}
