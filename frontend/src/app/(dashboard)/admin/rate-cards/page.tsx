"use client";
import React, { useEffect, useState } from "react";
import { adminApi } from "../../../../lib/api";

interface RateCard {
  id: string;
  name: string;
  version: number;
  businessType: "B2C" | "B2B";
  baseRateIntraZone: string;
  perKgRateIntraZone: string;
  baseRateInterZone: string;
  perKgRateInterZone: string;
  codSurchargeFlat: string;
  codSurchargePercent: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: { fullName: string } | null;
  createdAt: string;
}

export default function AdminRateCardsPage() {
  const [cards, setCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    businessType: "B2C" as "B2C" | "B2B",
    name: "",
    baseRateIntraZone: "",
    perKgRateIntraZone: "",
    baseRateInterZone: "",
    perKgRateInterZone: "",
    codSurchargeFlat: "",
    codSurchargePercent: "",
  });

  const fetchCards = () => {
    setLoading(true);
    adminApi
      .rateCards()
      .then((res) => {
        setCards(res.data.data);
        setError("");
      })
      .catch(() => setError("Failed to fetch rate cards."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCards();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      await adminApi.createRateCard({
        businessType: form.businessType,
        name: form.name,
        baseRateIntraZone: parseFloat(form.baseRateIntraZone),
        perKgRateIntraZone: parseFloat(form.perKgRateIntraZone),
        baseRateInterZone: parseFloat(form.baseRateInterZone),
        perKgRateInterZone: parseFloat(form.perKgRateInterZone),
        codSurchargeFlat: parseFloat(form.codSurchargeFlat || "0"),
        codSurchargePercent: parseFloat(form.codSurchargePercent || "0"),
      });

      setModalOpen(false);
      setForm({
        businessType: "B2C",
        name: "",
        baseRateIntraZone: "",
        perKgRateIntraZone: "",
        baseRateInterZone: "",
        perKgRateInterZone: "",
        codSurchargeFlat: "",
        codSurchargePercent: "",
      });
      fetchCards();
    } catch (err) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setSubmitError(
        errorMsg ?? "Failed to create rate card version."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activeB2C = cards.find((c) => c.businessType === "B2C" && c.isActive);
  const activeB2B = cards.find((c) => c.businessType === "B2B" && c.isActive);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Rate Cards
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage delivery rate matrices and COD surcharge structures
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition cursor-pointer select-none"
        >
          + Create New Version
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          <div className="h-48 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-600 font-medium">
          ⚠️ {error}
        </div>
      ) : (
        <>
          {/* ── Active Rates Summary Cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* B2C Active Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute right-4 top-4 bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Active B2C
              </div>
              {activeB2C ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      {activeB2C.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Version {activeB2C.version} • Created by{" "}
                      {activeB2C.createdBy?.fullName || "System"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-white/60 rounded-xl p-3 border border-indigo-100/50">
                      <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                        Intra-Zone
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        ₹{Number(activeB2C.baseRateIntraZone).toFixed(2)}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          base
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        + ₹{Number(activeB2C.perKgRateIntraZone).toFixed(2)}/kg
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3 border border-indigo-100/50">
                      <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                        Inter-Zone
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        ₹{Number(activeB2C.baseRateInterZone).toFixed(2)}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          base
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        + ₹{Number(activeB2C.perKgRateInterZone).toFixed(2)}/kg
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 text-xs text-slate-600 font-medium">
                    💰 COD Surcharge:{" "}
                    <strong className="text-slate-800">
                      ₹{Number(activeB2C.codSurchargeFlat).toFixed(2)} +{" "}
                      {activeB2C.codSurchargePercent}%
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No active B2C rate card defined.
                </div>
              )}
            </div>

            {/* B2B Active Card */}
            <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute right-4 top-4 bg-violet-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Active B2B
              </div>
              {activeB2B ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      {activeB2B.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Version {activeB2B.version} • Created by{" "}
                      {activeB2B.createdBy?.fullName || "System"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-white/60 rounded-xl p-3 border border-violet-100/50">
                      <span className="text-[10px] text-violet-700 font-bold uppercase tracking-wider block">
                        Intra-Zone
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        ₹{Number(activeB2B.baseRateIntraZone).toFixed(2)}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          base
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        + ₹{Number(activeB2B.perKgRateIntraZone).toFixed(2)}/kg
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3 border border-violet-100/50">
                      <span className="text-[10px] text-violet-700 font-bold uppercase tracking-wider block">
                        Inter-Zone
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        ₹{Number(activeB2B.baseRateInterZone).toFixed(2)}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          base
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        + ₹{Number(activeB2B.perKgRateInterZone).toFixed(2)}/kg
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 text-xs text-slate-600 font-medium">
                    💰 COD Surcharge:{" "}
                    <strong className="text-slate-800">
                      ₹{Number(activeB2B.codSurchargeFlat).toFixed(2)} +{" "}
                      {activeB2B.codSurchargePercent}%
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No active B2B rate card defined.
                </div>
              )}
            </div>
          </div>

          {/* ── Version History List ── */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Version History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Business</th>
                    <th className="px-6 py-3">Card Name</th>
                    <th className="px-6 py-3">Intra (Base/Kg)</th>
                    <th className="px-6 py-3">Inter (Base/Kg)</th>
                    <th className="px-6 py-3">COD Surcharge</th>
                    <th className="px-6 py-3">Effective Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {cards.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            ● Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Historic
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                            c.businessType === "B2C"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {c.businessType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {c.name}{" "}
                        <span className="text-slate-400 text-xs font-normal">
                          v{c.version}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        ₹{Number(c.baseRateIntraZone).toFixed(0)} / ₹
                        {Number(c.perKgRateIntraZone).toFixed(0)}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        ₹{Number(c.baseRateInterZone).toFixed(0)} / ₹
                        {Number(c.perKgRateInterZone).toFixed(0)}
                      </td>
                      <td className="px-6 py-4 text-slate-700 text-xs">
                        ₹{Number(c.codSurchargeFlat).toFixed(0)} +{" "}
                        {c.codSurchargePercent}%
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                        <div>
                          {new Date(c.effectiveFrom).toLocaleDateString(
                            "en-IN"
                          )}
                        </div>
                        {c.effectiveTo && (
                          <div className="text-[10px] mt-0.5">
                            to{" "}
                            {new Date(c.effectiveTo).toLocaleDateString(
                              "en-IN"
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Create Version Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0"
            onClick={() => setModalOpen(false)}
          ></div>
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl z-10 overflow-hidden animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                Create New Rate Card Version
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                    value={form.businessType}
                    onChange={handleChange}
                  >
                    <option value="B2C">B2C (Consumer)</option>
                    <option value="B2B">B2B (Enterprise)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Card Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Standard B2C Rates"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Intra-Zone Rates (Local)
                </span>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Base Rate (₹)
                    </label>
                    <input
                      type="number"
                      name="baseRateIntraZone"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g. 50"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      value={form.baseRateIntraZone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Per Kg Rate (₹)
                    </label>
                    <input
                      type="number"
                      name="perKgRateIntraZone"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g. 15"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      value={form.perKgRateIntraZone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Inter-Zone Rates (Regional/National)
                </span>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Base Rate (₹)
                    </label>
                    <input
                      type="number"
                      name="baseRateInterZone"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g. 80"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      value={form.baseRateInterZone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Per Kg Rate (₹)
                    </label>
                    <input
                      type="number"
                      name="perKgRateInterZone"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g. 20"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      value={form.perKgRateInterZone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  COD Surcharges
                </span>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Flat Fee (₹)
                    </label>
                    <input
                      type="number"
                      name="codSurchargeFlat"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 20"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      value={form.codSurchargeFlat}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Percent Surcharge (%)
                    </label>
                    <input
                      type="number"
                      name="codSurchargePercent"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g. 1.5"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      value={form.codSurchargePercent}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-600 text-xs font-medium">
                  ⚠️ {submitError}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-grow border border-slate-300 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-grow bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/10 disabled:opacity-60 cursor-pointer select-none"
                >
                  {submitting ? "Saving Version..." : "Activate Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
