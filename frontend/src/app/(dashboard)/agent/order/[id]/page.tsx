"use client";
import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ordersApi } from "../../../../../lib/api";
import type { Order, OrderStatus } from "../../../../../types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Order Created",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered Successfully",
  FAILED: "Delivery Failed",
  RESCHEDULED: "Delivery Rescheduled",
  CANCELLED: "Order Cancelled",
};

export default function AgentOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<OrderStatus>("PICKED_UP");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const fetchOrder = () => {
      setLoading(true);
      ordersApi
        .getById(resolvedParams.id)
        .then((res) => {
          const ord = res.data as Order;
          setOrder(ord);
          // Default select next state if available
          if (ord.nextStates && ord.nextStates.length > 0) {
            setStatus(ord.nextStates[0]);
          }
          setError("");
        })
        .catch(() => setError("Order not found or access denied."))
        .finally(() => setLoading(false));
    };

    fetchOrder();
  }, [resolvedParams.id]);

  const handleDetectGeo = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      () => {
        alert("Unable to retrieve your location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      await ordersApi.updateStatus(resolvedParams.id, {
        status,
        notes: notes || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      });
      router.push("/agent");
    } catch (err) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setSubmitError(
        errorMsg ?? "Failed to update order status."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (st: OrderStatus) => {
    switch (st) {
      case "DELIVERED":
        return "✅";
      case "FAILED":
        return "❌";
      case "IN_TRANSIT":
        return "🚚";
      case "OUT_FOR_DELIVERY":
        return "🛵";
      default:
        return "📦";
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      {/* ── Nav Header ── */}
      <div className="flex justify-between items-center">
        <Link
          href="/agent"
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
        >
          ← Back to Deliveries
        </Link>
        {order && (
          <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            #{order.orderNumber}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          <div className="h-48 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-600 font-medium">
          ⚠️ {error}
        </div>
      ) : !order ? (
        <div className="text-center py-10 text-slate-400">Order not found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Column: Order details card ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Order Details
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                    Placed on {new Date(order.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full text-xs uppercase border border-indigo-100">
                  {order.businessType}
                </span>
              </div>

              {/* Addresses details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1.5 p-3.5 bg-emerald-50/50 border border-emerald-100/50 rounded-xl">
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block">
                    📍 Pickup Location
                  </span>
                  <p className="font-bold text-slate-800">
                    {order.pickupAddress.street}
                  </p>
                  <p className="text-slate-500 font-medium">
                    {order.pickupAddress.city}, {order.pickupAddress.state}
                  </p>
                </div>

                <div className="space-y-1.5 p-3.5 bg-rose-50/50 border border-rose-100/50 rounded-xl">
                  <span className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider block">
                    🎯 Drop Destination
                  </span>
                  <p className="font-bold text-slate-800">
                    {order.dropAddress.street}
                  </p>
                  <p className="text-slate-500 font-medium">
                    {order.dropAddress.city}, {order.dropAddress.state}
                  </p>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Customer Info
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {order.customer.fullName}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold">
                    {order.customer.phone}
                  </p>
                </div>
                <a
                  href={`tel:${order.customer.phone}`}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md shadow-indigo-600/10 inline-flex items-center gap-1 select-none"
                >
                  📞 Call Customer
                </a>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 pt-1">
                <div>
                  Payment Type:{" "}
                  <strong className="text-slate-800">{order.paymentType}</strong>
                </div>
                {order.paymentType === "COD" && (
                  <div className="text-right text-amber-600">
                    Collect Amount:{" "}
                    <strong className="text-amber-700 text-sm block md:inline font-extrabold">
                      ₹{Number(order.codCollectAmount).toFixed(2)}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Update status panel ── */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base">
                Update Status
              </h3>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Provide notes and GPS coordinates to log this tracking event.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Select New State
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  >
                    {order.nextStates && order.nextStates.length > 0 ? (
                      order.nextStates.map((st) => (
                        <option key={st} value={st}>
                          {getStatusIcon(st)} {STATUS_LABELS[st] || st}
                        </option>
                      ))
                    ) : (
                      // Fallback to all states if backend doesn't supply nextStates
                      Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {getStatusIcon(key as OrderStatus)} {label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Coordinates
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Latitude"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition font-mono"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Longitude"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition font-mono"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGeo}
                    disabled={geoLoading}
                    className="w-full text-center text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 py-1.5 rounded-lg border border-dashed border-indigo-200/50 transition cursor-pointer select-none mt-2"
                  >
                    {geoLoading ? "Locating..." : "📍 Detect Coordinates"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Update Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter notes (e.g. customer request delivery at door, address verified)..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {submitError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-600 text-xs font-medium">
                    ⚠️ {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/10 disabled:opacity-60 cursor-pointer select-none"
                >
                  {submitting ? "Submitting..." : "Update Status ✓"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
