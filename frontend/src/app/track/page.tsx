"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Package, Truck, CheckCircle2, Navigation, Clock, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";

export default function PublicTrackingPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    
    setLoading(true);
    setError("");
    setOrder(null);
    
    try {
      // Intentionally call the existing public endpoint
      const res = await api.get(`/orders/track/${orderNumber.trim()}`);
      setOrder(res.data.order);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Order not found. Please check the order number and try again.");
      } else {
        setError("Failed to fetch tracking details. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED": return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "FAILED": return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case "OUT_FOR_DELIVERY": return <Truck className="w-5 h-5 text-blue-500" />;
      case "IN_TRANSIT": return <Navigation className="w-5 h-5 text-amber-500" />;
      default: return <Package className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header Section */}
        <div className="bg-[#0033a0] p-8 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/images/bg_pattern.jpg')] bg-cover"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#ffc000] rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Truck className="w-8 h-8 text-[#0033a0]" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Track Your Shipment</h1>
            <p className="text-[#d0dcf2] text-sm max-w-md">
              Enter your LastMile Logistics tracking number to get real-time updates on your delivery.
            </p>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="p-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. LMD-123456789"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0033a0] focus:ring-4 focus:ring-[#0033a0]/10 transition-all font-bold tracking-widest text-slate-800 placeholder:text-slate-300 placeholder:font-normal uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !orderNumber.trim()}
              className="bg-[#0033a0] hover:bg-[#002277] disabled:bg-slate-300 text-white font-bold px-8 rounded-xl transition-colors shadow-md disabled:shadow-none flex items-center"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Package className="w-5 h-5" />
                </motion.div>
              ) : (
                "Track"
              )}
            </button>
          </form>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mt-6 bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl flex items-center gap-3 font-bold text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {order && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="mt-8 pt-8 border-t border-slate-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Order Number</div>
                    <div className="text-2xl font-black text-slate-800 tracking-tight">{order.orderNumber}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                    {getStatusIcon(order.status)}
                    <span className="font-bold text-sm text-slate-700">{order.status.replace(/_/g, " ")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Destination</div>
                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0033a0]" />
                      {order.dropAddress.city}, {order.dropAddress.state}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Status</div>
                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                      {order.paymentType === "COD" ? (
                        <span className="text-amber-600 bg-amber-100 px-2 py-0.5 rounded text-xs">COD Unpaid</span>
                      ) : order.paymentStatus === "PAID" ? (
                        <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded text-xs">Prepaid (Paid)</span>
                      ) : (
                        <span className="text-rose-600 bg-rose-100 px-2 py-0.5 rounded text-xs">Prepaid (Unpaid)</span>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Tracking Timeline
                </h3>

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:to-transparent">
                  {order.trackingHistory.map((event: any, i: number) => {
                    const isLatest = i === order.trackingHistory.length - 1;
                    return (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                          {getStatusIcon(event.status)}
                        </div>
                        
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 shadow-sm bg-white ml-4 md:ml-0">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-sm text-slate-800">{event.status.replace(/_/g, " ")}</span>
                            <span className="text-[11px] font-medium text-slate-500">{new Date(event.occurredAt).toLocaleString()}</span>
                            {event.notes && (
                              <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-medium">
                                {event.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs font-bold text-slate-400 flex items-center gap-2">
        <Truck className="w-3.5 h-3.5" /> Powered by LastMile Enterprise Logistics
      </div>
    </div>
  );
}
