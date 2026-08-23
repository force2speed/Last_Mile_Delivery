"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Truck, MapPin, User, ArrowRight, ShieldAlert, Power, CheckCircle2, Map as MapIcon, List, Package } from "lucide-react";
import { agentsApi } from "../../../lib/api";

interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  pickupAddress: { street: string; city: string; latitude: number | null; longitude: number | null };
  dropAddress: { street: string; city: string; latitude: number | null; longitude: number | null };
  customer: { fullName: string; phone: string };
}

const STATUS_STYLE: Record<string, string> = {
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

export default function AgentDashboard() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentStatus, setAgentStatus] = useState<"AVAILABLE" | "OFFLINE">("OFFLINE");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const fetchOrders = () => {
    setLoading(true);
    agentsApi.myOrders()
      .then((r) => { setOrders(r.data.data); setError(""); })
      .catch(() => setError("Failed to fetch manifest."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleToggleStatus = async (newStatus: "AVAILABLE" | "OFFLINE") => {
    setStatusSubmitting(true);
    try {
      await agentsApi.updateStatus({ status: newStatus });
      setAgentStatus(newStatus);
    } catch {
      alert("Failed to update status.");
    } finally {
      setStatusSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#0033a0] tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6" /> Driver Manifest
          </h1>
          <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
            Manage Duty Status and Active Routes
          </p>
        </div>

        {/* Live Status Control */}
        <div className="flex items-center gap-3 bg-[#f4f7fb] p-1.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 px-3">
            <span className={`w-2 h-2 rounded-full ${agentStatus === "AVAILABLE" ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
              {agentStatus === "AVAILABLE" ? "ON DUTY" : "OFF DUTY"}
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => handleToggleStatus("AVAILABLE")}
              disabled={statusSubmitting || agentStatus === "AVAILABLE"}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold px-4 py-2 rounded transition shadow-sm flex items-center gap-1.5"
            >
              <Power className="w-3.5 h-3.5" /> Online
            </button>
            <button
              onClick={() => handleToggleStatus("OFFLINE")}
              disabled={statusSubmitting || agentStatus === "OFFLINE"}
              className="text-xs bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold px-4 py-2 rounded transition shadow-sm flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Offline
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Deliveries Section ── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Assigned Shipments ({orders.length})
          </h2>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "map" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <MapIcon className="w-4 h-4" /> Map
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => <div key={i} className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-600 font-bold text-sm">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-400 shadow-sm">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
            <p className="text-sm font-bold text-slate-600">No active shipments assigned.</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Your current route is clear.</p>
          </div>
        ) : viewMode === "map" ? (
          <div className="w-full h-[500px] bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {orders.map((o) => (
                <Link 
                  key={o.id} href={`/agent/order/${o.id}`}
                  className="bg-white px-4 py-2 rounded-lg shadow border border-slate-200 text-xs font-bold flex-shrink-0 flex items-center gap-2 hover:border-[#0033a0] transition"
                >
                  <span className="text-[#0033a0]">#{o.orderNumber}</span>
                  <span className="text-slate-400">|</span>
                  <span>{o.dropAddress.city}</span>
                </Link>
              ))}
            </div>
            
            {/* Simple relative plotter for demonstration */}
            {(() => {
              const validPoints = orders.filter(o => o.dropAddress.latitude && o.dropAddress.longitude);
              if (validPoints.length === 0) return <span className="text-sm font-bold text-slate-400 z-10">No GPS coordinates available for current orders.</span>;
              
              const minLat = Math.min(...validPoints.map(d => Number(d.dropAddress.latitude)));
              const maxLat = Math.max(...validPoints.map(d => Number(d.dropAddress.latitude)));
              const minLng = Math.min(...validPoints.map(d => Number(d.dropAddress.longitude)));
              const maxLng = Math.max(...validPoints.map(d => Number(d.dropAddress.longitude)));

              return validPoints.map((point) => {
                const lat = Number(point.dropAddress.latitude);
                const lng = Number(point.dropAddress.longitude);
                const yPct = ((maxLat - lat) / (maxLat - minLat || 1)) * 80 + 10;
                const xPct = ((lng - minLng) / (maxLng - minLng || 1)) * 80 + 10;
                
                return (
                  <div 
                    key={point.id}
                    className="absolute z-10 group"
                    style={{ top: `${yPct}%`, left: `${xPct}%` }}
                  >
                    <div className="w-6 h-6 bg-[#0033a0] rounded-full border-2 border-white shadow flex items-center justify-center -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform cursor-pointer">
                      <Package className="w-3 h-3 text-white" />
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      #{point.orderNumber} - {point.dropAddress.city}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {orders.map((o, idx) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300"
              >
                <div className="bg-[#f4f7fb] px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-mono text-sm font-black text-[#0033a0]">
                    #{o.orderNumber}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_STYLE[o.status] || ""}`}>
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="p-4 space-y-4 flex-1">
                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Pickup Facility:</strong>
                      <span className="text-sm font-bold text-slate-800">{o.pickupAddress.street}, {o.pickupAddress.city}</span>
                    </div>
                  </div>
                  
                  <div className="ml-2 border-l-2 border-dashed border-slate-200 h-4" />

                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Delivery Destination:</strong>
                      <span className="text-sm font-bold text-slate-800">{o.dropAddress.street}, {o.dropAddress.city}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <User className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Consignee:</strong>
                      <span className="text-sm font-bold text-slate-800">{o.customer.fullName} ({o.customer.phone})</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-[#f4f7fb]">
                  <Link
                    href={`/agent/order/${o.id}`}
                    className="flex justify-center items-center gap-2 w-full text-sm bg-[#0033a0] hover:bg-[#002277] text-white rounded-lg py-3 font-bold transition shadow-sm"
                  >
                    Update Waybill Status <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
