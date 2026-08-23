"use client";
import React, { useEffect, useState } from "react";
import { adminApi } from "../../../../lib/api";

interface Area {
  id: string;
  name: string;
  pincode: string;
  isActive: boolean;
}

interface Zone {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  areas: Area[];
}

export default function AdminZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals / forms state
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneSubmitting, setZoneSubmitting] = useState(false);
  const [zoneForm, setZoneForm] = useState({ name: "", code: "", description: "" });
  const [zoneError, setZoneError] = useState("");

  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [areaSubmitting, setAreaSubmitting] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [areaForm, setAreaForm] = useState({ name: "", pincode: "" });
  const [areaError, setAreaError] = useState("");

  const fetchZones = () => {
    setLoading(true);
    adminApi
      .zones()
      .then((res) => {
        setZones(res.data.data);
        setError("");
      })
      .catch(() => setError("Failed to fetch zones and areas."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchZones();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setZoneSubmitting(true);
    setZoneError("");

    try {
      await adminApi.createZone(zoneForm);
      setZoneModalOpen(false);
      setZoneForm({ name: "", code: "", description: "" });
      fetchZones();
    } catch (err) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setZoneError(errorMsg ?? "Failed to create zone.");
    } finally {
      setZoneSubmitting(false);
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setAreaSubmitting(true);
    setAreaError("");

    try {
      await adminApi.createArea(selectedZoneId, areaForm);
      setAreaModalOpen(false);
      setAreaForm({ name: "", pincode: "" });
      fetchZones();
    } catch (err) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setAreaError(errorMsg ?? "Failed to add area.");
    } finally {
      setAreaSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Zones &amp; Areas
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Define service regions (zones) and map pincodes (areas) to establish routing boundaries
          </p>
        </div>
        <button
          onClick={() => setZoneModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition cursor-pointer select-none"
        >
          + Create Zone
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-600 font-medium">
          ⚠️ {error}
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
          <div className="text-5xl mb-3">📍</div>
          <p className="text-sm font-medium">No service zones defined yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight">
                      {zone.name}
                    </h3>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider block w-max mt-1">
                      Code: {zone.code}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    Active
                  </span>
                </div>
                {zone.description && (
                  <p className="text-xs text-slate-400 font-medium mt-3 italic line-clamp-2">
                    {zone.description}
                  </p>
                )}

                {/* Areas mapping */}
                <div className="mt-5 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Serviced Areas ({zone.areas.length})
                  </span>
                  {zone.areas.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No pincodes mapped to this zone yet.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {zone.areas.map((area) => (
                        <div
                          key={area.id}
                          className="flex justify-between items-center text-xs bg-slate-50 border border-slate-100 rounded-lg p-2 font-medium"
                        >
                          <span className="text-slate-600 truncate max-w-[120px]">
                            {area.name}
                          </span>
                          <span className="font-mono text-indigo-600 font-bold bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/30">
                            {area.pincode}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedZoneId(zone.id);
                    setAreaModalOpen(true);
                  }}
                  className="w-full text-center text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 py-2 rounded-xl transition cursor-pointer select-none border border-indigo-100/30 hover:border-transparent"
                >
                  + Add Area (Pincode)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Zone Modal ── */}
      {zoneModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0"
            onClick={() => setZoneModalOpen(false)}
          ></div>
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl z-10 overflow-hidden animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                Create Service Zone
              </h3>
              <button
                onClick={() => setZoneModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateZone} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Zone Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Delhi"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  value={zoneForm.name}
                  onChange={(e) =>
                    setZoneForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Zone Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SDL"
                  maxLength={10}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  value={zoneForm.code}
                  onChange={(e) =>
                    setZoneForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe zone coverage area..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  value={zoneForm.description}
                  onChange={(e) =>
                    setZoneForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              {zoneError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-600 text-xs font-medium">
                  ⚠️ {zoneError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneModalOpen(false)}
                  className="flex-grow border border-slate-300 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={zoneSubmitting}
                  className="flex-grow bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/10 disabled:opacity-60 cursor-pointer select-none"
                >
                  {zoneSubmitting ? "Creating..." : "Create Zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Area Modal ── */}
      {areaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0"
            onClick={() => setAreaModalOpen(false)}
          ></div>
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl z-10 overflow-hidden animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                Add Serviced Area (Pincode)
              </h3>
              <button
                onClick={() => setAreaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateArea} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Area Name / Locality
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saket"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  value={areaForm.name}
                  onChange={(e) =>
                    setAreaForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 110030"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  value={areaForm.pincode}
                  onChange={(e) =>
                    setAreaForm((f) => ({ ...f, pincode: e.target.value }))
                  }
                />
              </div>

              {areaError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-600 text-xs font-medium">
                  ⚠️ {areaError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAreaModalOpen(false)}
                  className="flex-grow border border-slate-300 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={areaSubmitting}
                  className="flex-grow bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/10 disabled:opacity-60 cursor-pointer select-none"
                >
                  {areaSubmitting ? "Adding..." : "Add Area"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
