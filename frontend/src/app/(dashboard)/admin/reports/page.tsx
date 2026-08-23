"use client";
import React, { useEffect, useState } from "react";
import { BarChart3, Map as MapIcon, Loader2 } from "lucide-react";
import { adminApi } from "../../../../lib/api";

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ revenueTrend: any[], heatMapData: any[] } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await adminApi.reports();
        setData(res.data);
      } catch (err) {
        console.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0033a0]" />
      </div>
    );
  }

  if (!data) return <div>Failed to load data.</div>;

  // Find max revenue to scale the CSS bar chart
  const maxRevenue = Math.max(...data.revenueTrend.map((d: any) => d.revenue), 1);

  // For heatmap, find min/max lat/lng to plot points relatively
  const validPoints = data.heatMapData.filter(d => d.drop && d.drop.latitude && d.drop.longitude);
  const minLat = Math.min(...validPoints.map(d => Number(d.drop.latitude)));
  const maxLat = Math.max(...validPoints.map(d => Number(d.drop.latitude)));
  const minLng = Math.min(...validPoints.map(d => Number(d.drop.longitude)));
  const maxLng = Math.max(...validPoints.map(d => Number(d.drop.longitude)));

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Analytics & Reports</h1>
        <p className="text-sm text-slate-500 font-medium">Historical revenue trends and delivery density maps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-bold text-slate-800">7-Day Revenue Trend</h2>
          </div>
          
          <div className="flex items-end justify-between h-48 gap-2">
            {data.revenueTrend.map((day: any, i: number) => {
              const heightPct = (day.revenue / maxRevenue) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                  <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ₹{day.revenue}
                  </div>
                  <div className="w-full bg-slate-100 rounded-t-sm relative h-full flex items-end">
                    <div 
                      className="w-full bg-[#0033a0] rounded-t-sm transition-all duration-500"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap Simulation */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
              <MapIcon className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="font-bold text-slate-800">Delivery Heatmap (Recent 500)</h2>
          </div>
          
          <div className="w-full h-64 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            
            {validPoints.length === 0 ? (
              <span className="text-sm font-bold text-slate-400 z-10">No coordinate data available</span>
            ) : (
              validPoints.map((point, i) => {
                const lat = Number(point.drop.latitude);
                const lng = Number(point.drop.longitude);
                // Inverse Y axis because latitude increases going UP
                const yPct = ((maxLat - lat) / (maxLat - minLat || 1)) * 100;
                const xPct = ((lng - minLng) / (maxLng - minLng || 1)) * 100;
                
                return (
                  <div 
                    key={i}
                    className="absolute w-3 h-3 bg-rose-500/60 rounded-full blur-[1px]"
                    style={{
                      top: `calc(${yPct}% - 6px)`,
                      left: `calc(${xPct}% - 6px)`,
                    }}
                    title={point.drop.city}
                  />
                );
              })
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center uppercase tracking-widest font-bold">
            Density based on Drop-off Coordinates
          </p>
        </div>

      </div>
    </div>
  );
}
