"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle2, FileText, Search, Filter } from "lucide-react";
import { ordersApi } from "../../../lib/api";
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

interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalCharge: number;
  paymentType: string;
  createdAt: string;
  dropAddress: { city: string; street: string } | null;
  businessType: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    ordersApi.list()
      .then((r) => { setOrders(r.data.data); setError(""); })
      .catch(() => setError("Failed to load shipments."))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.dropAddress?.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.dropAddress?.street || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = orders.length;
  const activeCount = orders.filter((o) =>
    ["CREATED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED"].includes(o.status)
  ).length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;

  return (
    <div className="space-y-6 font-sans pb-8">
      
      {/* ── Graphic Banner ── */}
      <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/warehouse.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0033a0]/90 to-[#0033a0]/30 mix-blend-multiply" />
        <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-md">Shipment Dashboard</h1>
          <p className="text-sm font-bold mt-1 tracking-wider uppercase text-white/90 drop-shadow-sm">
            Monitor and manage your corporate logistics
          </p>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-slate-800">{totalCount}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Waybills</div>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-[#0033a0] flex items-center gap-2">
              {activeCount}
              {activeCount > 0 && <span className="w-2 h-2 rounded-full bg-[#0033a0] animate-ping" />}
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Active Transits</div>
          </div>
          <div className="w-12 h-12 bg-[#0033a0]/10 rounded-lg flex items-center justify-center text-[#0033a0]">
            <Truck className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-emerald-600">{deliveredCount}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Delivered Successfully</div>
          </div>
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* ── Orders Logs Section ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-[#f4f7fb] flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0033a0]" /> Recent Shipments
          </h3>
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 items-center">
            <Link
              href="/customer/orders/new"
              className="w-full md:w-auto bg-[#ffc000] hover:bg-[#e6ad00] text-[#0033a0] text-sm font-bold px-6 py-2 rounded-lg shadow-sm transition-all flex justify-center items-center gap-2"
            >
              <Package className="w-4 h-4" /> Create Shipment
            </Link>
            <div className="relative w-full md:w-64">
              <input
                type="text" placeholder="Search waybill # or city..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#0033a0] focus:ring-1 focus:ring-[#0033a0] transition"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>
            <div className="relative w-full md:w-48">
              <select
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#0033a0] focus:ring-1 focus:ring-[#0033a0] appearance-none transition"
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="CREATED">Created</option>
                <option value="PICKUP_SCHEDULED">Scheduled</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-bold bg-rose-50 text-sm">{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20 text-slate-500" />
            <p className="text-sm font-bold">No shipments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Waybill Number</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Terms</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50 transition duration-150 cursor-pointer"
                    onClick={() => router.push(`/customer/track/${o.orderNumber}`)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-[#0033a0]">
                      #{o.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{o.dropAddress?.city || "Local"}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[190px] mt-0.5">{o.dropAddress?.street}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                        {o.paymentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium text-xs">
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
    </div>
  );
}
