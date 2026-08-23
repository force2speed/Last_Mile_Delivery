"use client";
import React from "react";
import { motion } from "framer-motion";
import { BookOpen, MapPin, Truck, ShieldCheck, Box } from "lucide-react";

export default function GuidePage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold text-[#0033a0] tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[#ffc000]" />
          LastMile Logistics User Guide
        </h1>
        <p className="mt-2 text-slate-500 font-medium">
          Welcome to the LastMile Logistics platform. Below is a quick overview of how to use our core features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 border border-blue-100">
            <Box className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Creating Shipments</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            As a customer, you can create new delivery orders by clicking "Create Shipment". You'll need to specify pickup and drop-off addresses, package dimensions, and whether it requires Cash on Delivery (COD). The system instantly calculates shipping rates based on active Rate Cards.
          </p>
        </motion.div>

        {/* Section 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 border border-amber-100">
            <Truck className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Smart Agent Dispatch</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            You don't need to manually assign deliveries! Our proprietary Smart Dispatch Algorithm automatically assigns your order to the best available delivery agent based on GPS proximity, current workload balance (anti-hotspotting), and Zone boundaries.
          </p>
        </motion.div>

        {/* Section 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100">
            <MapPin className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Zones & Areas</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Administrators configure Zones to geofence operational areas. Delivery rates depend on whether a package is traveling Intra-Zone (within the same zone) or Inter-Zone (crossing zone boundaries). Agents are typically assigned to specific Home Zones.
          </p>
        </motion.div>

        {/* Section 4 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 border border-purple-100">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Administrator Tools</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            System Administrators have full oversight of the platform. They can register new delivery agents, modify rate cards, track live system revenue, monitor agent active workloads, and manage zone mappings across the network.
          </p>
        </motion.div>
      </div>

      <div className="bg-[#0033a0] text-white rounded-2xl p-8 mt-8 shadow-lg text-center relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-3 text-[#ffc000]">Need further assistance?</h3>
          <p className="text-sm text-blue-100 max-w-xl mx-auto mb-6">
            If you encounter any issues or have questions that aren't covered in this guide, our enterprise support team is available 24/7 to help keep your logistics moving.
          </p>
          <button className="bg-white text-[#0033a0] hover:bg-slate-100 font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
