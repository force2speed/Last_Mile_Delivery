"use client";
import React, { useEffect, useState } from "react";
import { agentsApi, adminApi } from "../../../../lib/api";

interface Zone {
  id: string;
  name: string;
  code: string;
}

interface AgentProfile {
  id: string;
  userId: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  vehicleType: string | null;
  vehicleNumber: string | null;
  activeOrders: number;
  homeZone: Zone | null;
  currentZone: Zone | null;
  user: {
    fullName: string;
    email: string;
    phone: string;
    isActive: boolean;
  };
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    role: "DELIVERY_AGENT" as "DELIVERY_AGENT" | "ADMIN",
    email: "",
    password: "",
    fullName: "",
    phone: "",
    homeZoneId: "",
    vehicleType: "",
    vehicleNumber: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, zonesRes] = await Promise.all([
        agentsApi.list(),
        adminApi.zones(),
      ]);
      setAgents(agentsRes.data.data);
      setZones(zonesRes.data.data);
      setError("");
    } catch {
      setError("Failed to fetch delivery agents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, { isActive: !currentActive });
      fetchData();
    } catch {
      alert("Failed to update user account status.");
    }
  };

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
      await adminApi.createUser({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone,
        role: form.role,
        ...(form.role === "DELIVERY_AGENT" && {
          homeZoneId: form.homeZoneId || undefined,
          vehicleType: form.vehicleType || undefined,
          vehicleNumber: form.vehicleNumber || undefined,
        }),
      });

      setModalOpen(false);
      setForm({
        role: "DELIVERY_AGENT",
        email: "",
        password: "",
        fullName: "",
        phone: "",
        homeZoneId: "",
        vehicleType: "",
        vehicleNumber: "",
      });
      fetchData();
    } catch (err) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setSubmitError(
        errorMsg ?? "Failed to register user/agent."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_STYLE = {
    AVAILABLE: "bg-emerald-100 text-emerald-700 font-bold",
    BUSY: "bg-amber-100 text-amber-700 font-bold",
    OFFLINE: "bg-slate-100 text-slate-500 font-semibold",
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Delivery Agents
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Register delivery personnel, monitor real-time workloads, and manage access
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition cursor-pointer select-none"
        >
          + Register User
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-white border border-slate-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-600 font-medium">
          ⚠️ {error}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
          <div className="text-5xl mb-3">🧑‍💼</div>
          <p className="text-sm font-medium">No delivery agents registered yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-3.5">Agent Details</th>
                  <th className="px-6 py-3.5">Home Zone</th>
                  <th className="px-6 py-3.5">Vehicle</th>
                  <th className="px-6 py-3.5">Workload</th>
                  <th className="px-6 py-3.5">Live Status</th>
                  <th className="px-6 py-3.5">Account status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {agents.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-800">
                          {a.user.fullName}
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">
                          {a.user.email} • {a.user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-semibold">
                      {a.homeZone ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {a.homeZone.name} ({a.homeZone.code})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-semibold">
                      {a.vehicleType ? (
                        <div>
                          {a.vehicleType}
                          {a.vehicleNumber && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              #{a.vehicleNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center text-xs font-extrabold px-2 py-0.5 rounded-full ${
                          a.activeOrders > 0
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {a.activeOrders} active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center text-[10px] uppercase px-2 py-0.5 rounded-full ${
                          STATUS_STYLE[a.status] || STATUS_STYLE.OFFLINE
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {a.user.isActive ? (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                          🟢 Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-bold text-rose-500">
                          🔴 Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          handleToggleStatus(a.userId, a.user.isActive)
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition select-none cursor-pointer ${
                          a.user.isActive
                            ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {a.user.isActive ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0"
            onClick={() => setModalOpen(false)}
          ></div>
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl z-10 overflow-hidden animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                Register New User Account
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
                    System Role
                  </label>
                  <select
                    name="role"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="DELIVERY_AGENT">Delivery Agent</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                    value={form.fullName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@lastmile.dev"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  required
                  placeholder="e.g. +919999999999"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              {form.role === "DELIVERY_AGENT" && (
                <div className="border-t border-slate-100 pt-4 space-y-4 animate-fade-in">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Agent-Specific Profile Details
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Home Zone
                      </label>
                      <select
                        name="homeZoneId"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                        value={form.homeZoneId}
                        onChange={handleChange}
                      >
                        <option value="">Select zone...</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} ({z.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Vehicle Type
                      </label>
                      <input
                        type="text"
                        name="vehicleType"
                        placeholder="e.g. Bike, Scooter, Mini-Truck"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                        value={form.vehicleType}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      placeholder="e.g. DL01AB1234"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      value={form.vehicleNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

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
                  {submitting ? "Registering..." : "Register User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
