"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Users, DollarSign, CheckCircle2, Truck, XCircle, FileText } from "lucide-react";
import { adminApi, ordersApi } from "../../../lib/api";
import type { OrderStatus } from "../../../types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-rose-100 text-rose-800 border-rose-200",
  CANCELLED: "bg-slate-200 text-slate-700 border-slate-300",
  IN_TRANSIT: "bg-violet-100 text-violet-800 border-violet-200",
  OUT_FOR_DELIVERY: "bg-[#ffc000]/20 text-[#997300] border-[#ffc000]/30",
  CREATED: "bg-slate-100 text-slate-800 border-slate-300",
  PICKUP_SCHEDULED: "bg-[#0033a0]/10 text-[#0033a0] border-[#0033a0]/20",
  PICKED_UP: "bg-sky-100 text-sky-800 border-sky-200",
  RESCHEDULED: "bg-orange-100 text-orange-800 border-orange-200",
};

interface AdminStats {
  totalOrders: number;
  availableAgents: number;
  totalRevenue: number;
  byStatus: Record<string, number>;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalCharge: string;
  createdAt: string;
  customer: { fullName: string };
  dropAddress: { city: string } | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([adminApi.dashboard(), ordersApi.list({ limit: 5 })])
      .then(([statsRes, ordersRes]) => {
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data.data);
      })
      .catch(() => setError("Failed to fetch system metrics."))
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: "Total Bookings", value: stats.totalOrders, icon: Package, color: "text-[#0033a0]", bg: "bg-[#0033a0]/10" },
    { label: "Active Agents", value: stats.availableAgents, icon: Users, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Gross Revenue", value: `₹${Number(stats.totalRevenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-[#997300]", bg: "bg-[#ffc000]/20" },
    { label: "Delivered", value: stats.byStatus?.DELIVERED ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "In Transit", value: stats.byStatus?.IN_TRANSIT ?? 0, icon: Truck, color: "text-[#0033a0]", bg: "bg-[#0033a0]/10" },
    { label: "Exceptions", value: stats.byStatus?.FAILED ?? 0, icon: XCircle, color: "text-rose-600", bg: "bg-rose-100" },
  ] : [];

  return (
    <div className="space-y-6 font-sans">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-black text-[#0033a0] tracking-tight">Admin Control Center</h1>
        <p className="text-[11px] text-slate-500 font-bold mt-1 tracking-wider uppercase">System-wide performance & network metrics</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-600 font-bold text-sm">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {statCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-between hover:shadow-md transition">
                <div>
                  <div className="text-3xl font-black text-slate-800">{s.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{s.label}</div>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.bg} ${s.color}`}>
                  <s.icon className="w-6 h-6" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-8">
            <div className="px-6 py-5 border-b border-slate-200 bg-[#f4f7fb]">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0033a0]" /> Recent Network Activity
              </h3>
            </div>
            
            {recentOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20 text-slate-500" />
                <p className="text-sm font-bold">No network activity logged.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="px-6 py-4">Waybill Number</th>
                      <th className="px-6 py-4">Shipper</th>
                      <th className="px-6 py-4">Destination</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50 transition duration-150">
                        <td className="px-6 py-4 font-mono font-bold text-[#0033a0]">#{o.orderNumber}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{o.customer.fullName}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{o.dropAddress?.city || "Local"}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                          {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${STATUS_STYLE[o.status] || ""}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                          ₹{Number(o.totalCharge).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
