"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Calendar, Truck, CheckCircle2, XCircle, Clock, 
  Ban, MapPin, ChevronRight, Activity, FileText
} from "lucide-react";
import type { TrackingEvent, OrderStatus } from "../../types";

type StatusConfig = {
  icon: React.FC<any>;
  label: string;
  dot: string;       // bg color
  ring: string;      // ring color
  text: string;      // text color
  bg: string;        // card background
  border: string;    // card border
  isTerminal: boolean;
};

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  CREATED: {
    icon: Package, label: "Waybill Generated",
    dot: "bg-slate-500", ring: "ring-slate-100",
    text: "text-slate-700", bg: "bg-white", border: "border-slate-200",
    isTerminal: false,
  },
  PICKUP_SCHEDULED: {
    icon: Calendar, label: "Pickup Scheduled",
    dot: "bg-blue-500", ring: "ring-blue-100",
    text: "text-[#0033a0]", bg: "bg-blue-50", border: "border-blue-200",
    isTerminal: false,
  },
  PICKED_UP: {
    icon: Package, label: "Consignment Picked Up",
    dot: "bg-sky-500", ring: "ring-sky-100",
    text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200",
    isTerminal: false,
  },
  IN_TRANSIT: {
    icon: Truck, label: "In Transit",
    dot: "bg-violet-500", ring: "ring-violet-100",
    text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200",
    isTerminal: false,
  },
  OUT_FOR_DELIVERY: {
    icon: Activity, label: "Out for Delivery",
    dot: "bg-[#ffc000]", ring: "ring-[#ffc000]/30",
    text: "text-[#997300]", bg: "bg-[#fff9e6]", border: "border-[#ffc000]/40",
    isTerminal: false,
  },
  DELIVERED: {
    icon: CheckCircle2, label: "Shipment Delivered",
    dot: "bg-emerald-600", ring: "ring-emerald-100",
    text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",
    isTerminal: true,
  },
  FAILED: {
    icon: XCircle, label: "Delivery Attempt Failed",
    dot: "bg-rose-500", ring: "ring-rose-100",
    text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200",
    isTerminal: false,
  },
  RESCHEDULED: {
    icon: Clock, label: "Rescheduled",
    dot: "bg-orange-500", ring: "ring-orange-100",
    text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200",
    isTerminal: false,
  },
  CANCELLED: {
    icon: Ban, label: "Shipment Cancelled",
    dot: "bg-slate-500", ring: "ring-slate-100",
    text: "text-slate-600", bg: "bg-slate-100", border: "border-slate-300",
    isTerminal: true,
  },
};

function formatTs(iso: string) {
  const d = new Date(iso);
  return {
    absolute: d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }),
    relative: getRelative(d),
  };
}

function getRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)           return `${s}s ago`;
  if (s < 3600)         return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)        return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7)   return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function EventCard({
  event,
  isLast,
  isLatest,
  isTerminal,
  index
}: {
  event: TrackingEvent;
  isLast: boolean;
  isLatest: boolean;
  isTerminal: boolean;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.CREATED;
  const ts  = formatTs(event.occurredAt);
  const hasExtra = !!(event.notes || event.latitude);

  const actorLabel = event.actor ? event.actor.fullName : "System";
  const actorRole = event.actor ? event.actor.role.replace("_", " ") : "SYSTEM";

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="flex gap-4 relative"
    >
      {/* ── Left: dot + connector line ── */}
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border border-white bg-white ring-4 ${cfg.ring} z-10 flex-shrink-0 shadow-sm`}>
          <cfg.icon className={`w-4 h-4 ${cfg.text}`} />
          {isLatest && !isTerminal && (
            <span className={`absolute inset-0 rounded-full animate-ping opacity-30 ${cfg.dot}`} />
          )}
        </div>
        {!isLast && (
          <div className="w-[3px] flex-1 mt-2 mb-2 bg-slate-200 min-h-[2rem]" />
        )}
      </div>

      {/* ── Right: card (Like a log entry) ── */}
      <div className={`flex-1 mb-6 rounded-lg border p-4 shadow-sm transition duration-300 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold tracking-tight ${cfg.text}`}>{cfg.label}</span>
            {isLatest && !isTerminal && (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-0.5 rounded bg-[#ffc000] text-[#0033a0] select-none tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0033a0] animate-pulse" />
                Current Status
              </span>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs font-bold text-slate-700">{ts.absolute}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{ts.relative}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 font-medium bg-white/60 p-2 rounded border border-black/5">
          <span className="font-bold text-slate-700">Updated By:</span> {actorLabel} 
          <span className="text-[9px] uppercase tracking-wider bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-500">{actorRole}</span>
        </div>

        {hasExtra && (
          <div className="mt-3 pt-3 border-t border-black/5">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-[10px] font-bold text-[#0033a0] hover:text-[#002277] uppercase tracking-widest flex items-center gap-1 transition cursor-pointer select-none"
            >
              <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
              {expanded ? "Hide Details" : "View Details"}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2 pl-3 border-l-2 border-[#0033a0]/20 overflow-hidden"
                >
                  {event.notes && (
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px] block mb-0.5">Remarks:</span>
                      {event.notes}
                    </p>
                  )}
                  {event.latitude && event.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${event.latitude},${event.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0033a0] hover:underline font-bold"
                    >
                      <MapPin className="w-3 h-3" /> Location Scanned: {Number(event.latitude).toFixed(4)}, {Number(event.longitude).toFixed(4)}
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Horizontal Progress Milestones ──
interface MilestoneProps {
  label: string;
  active: boolean;
  done: boolean;
  icon: React.FC<any>;
}

function MilestoneStep({ label, active, done, icon: Icon }: MilestoneProps) {
  return (
    <div className="flex-1 flex flex-col items-center relative z-10">
      <div
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-300 bg-white ${
          active
            ? "border-[#ffc000] text-[#0033a0] ring-4 ring-[#ffc000]/20 scale-110"
            : done
            ? "border-[#0033a0] text-[#0033a0]"
            : "border-slate-200 text-slate-400"
        }`}
      >
        <Icon className={`w-4 h-4 ${active || done ? "opacity-100" : "opacity-50"}`} />
      </div>
      <span
        className={`text-[9px] font-bold uppercase tracking-wider mt-3 text-center px-1 truncate max-w-full ${
          active ? "text-[#0033a0]" : done ? "text-slate-800" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
  orderNumber: string;
  currentStatus: OrderStatus;
  className?: string;
}

const ACTIVE_STATUSES: OrderStatus[] = [
  "CREATED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED",
];

const MILESTONE_TIERS: Record<OrderStatus, number> = {
  CREATED: 0, CANCELLED: 0,
  PICKUP_SCHEDULED: 1, RESCHEDULED: 1,
  PICKED_UP: 2, IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 3, FAILED: 3,
  DELIVERED: 4,
};

export default function TrackingTimeline({
  events,
  orderNumber,
  currentStatus,
  className = "",
}: TrackingTimelineProps) {
  const isActive = ACTIVE_STATUSES.includes(currentStatus);
  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.CREATED;

  if (events.length === 0) {
    return (
      <div className={`text-center py-16 text-slate-500 ${className} bg-white rounded-2xl border border-slate-200 shadow-sm`}>
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20 text-slate-400" />
        <p className="text-sm font-bold tracking-wide">Awaiting Waybill Data</p>
      </div>
    );
  }

  const activeTier = MILESTONE_TIERS[currentStatus] ?? 0;
  const isCancelled = currentStatus === "CANCELLED";

  const milestones = [
    { label: "Booked", icon: FileText },
    { label: "Scheduled", icon: Calendar },
    { label: "Picked Up", icon: Package },
    { label: "In Transit", icon: Truck },
    { label: "Delivered", icon: CheckCircle2 },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-[#0033a0] tracking-tight">
            Shipment Tracking
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 font-bold uppercase tracking-wider">
            Waybill No: <span className="font-mono text-slate-800">#{orderNumber}</span>
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${cfg.bg} ${cfg.border} ${cfg.text}`}>
          <cfg.icon className="w-4 h-4" />
          <span>{cfg.label}</span>
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping ml-1" />}
        </div>
      </div>

      {/* ── Logistics Horizontal Milestone Progress Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-[42px] left-[10%] right-[10%] h-1.5 bg-slate-100 rounded-full z-0 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: isCancelled ? "0%" : `${(activeTier / (milestones.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="h-full bg-[#0033a0]"
          />
        </div>

        <div className="flex justify-between items-start relative z-10">
          {milestones.map((m, idx) => {
            const isDone = !isCancelled && idx < activeTier;
            const isCurrent = !isCancelled && idx === activeTier;
            return (
              <MilestoneStep
                key={m.label}
                label={m.label}
                active={isCurrent}
                done={isDone}
                icon={m.icon}
              />
            );
          })}
        </div>
      </div>

      {/* Timeline logs */}
      <div className="space-y-4 pt-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
          Tracking History ({events.length} Updates)
        </span>
        <div className="space-y-0">
          {events.map((event, idx) => (
            <EventCard
              key={event.id || idx}
              event={event}
              index={idx}
              isLast={idx === events.length - 1}
              isLatest={idx === events.length - 1}
              isTerminal={!!STATUS_CONFIG[event.status]?.isTerminal}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
