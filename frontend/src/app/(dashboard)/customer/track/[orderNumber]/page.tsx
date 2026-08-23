"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ordersApi } from "../../../../../lib/api";
import TrackingTimeline from "../../../../../components/tracking/TrackingTimeline";
import type { OrderStatus, TrackingEvent, Order } from "../../../../../types";

export default function TrackPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const resolvedParams = use(params);

  const [data, setData] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    ordersApi
      .trackPublic(resolvedParams.orderNumber)
      .then((r) => {
        setData(r.data.order);
        setError("");
      })
      .catch(() => setError("Order not found."))
      .finally(() => setLoading(false));
  }, [resolvedParams.orderNumber]);

  return (
    <div className="space-y-6 font-sans max-w-2xl mx-auto animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center pb-2 select-none">
        <Link
          href="/customer"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/50 transition cursor-pointer"
        >
          ← Dashboard
        </Link>
        {data && (
          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200/50 shadow-sm">
            Active Tracking
          </span>
        )}
      </div>

      {/* ── Main Container ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        {loading && (
          <div className="space-y-4">
            <div className="h-10 bg-slate-55 rounded-xl animate-pulse" />
            <div className="h-3 bg-slate-55 rounded w-2/3 animate-pulse" />
            <div className="h-px bg-slate-100 my-6 animate-pulse" />
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-55 animate-pulse" />
                <div className="flex-grow h-24 bg-slate-55 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-rose-500 font-bold select-none">
            <span className="text-4xl block mb-2">⚠️</span>
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {data && (
          <TrackingTimeline
            events={data.trackingHistory as TrackingEvent[]}
            orderNumber={data.orderNumber}
            currentStatus={data.status as OrderStatus}
          />
        )}
      </div>
    </div>
  );
}