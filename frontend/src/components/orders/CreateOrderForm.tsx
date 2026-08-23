"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  MapPin, 
  CreditCard, 
  ArrowRight, 
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText
} from "lucide-react";
import { rateApi, ordersApi, adminApi } from "../../lib/api";
import type { Area, Zone, PriceBreakdown, BusinessType, PaymentType } from "../../types";

interface ZoneWithAreas extends Zone {
  areas: { id: string; name: string; pincode: string; zoneId: string; isActive: boolean }[];
}

// ── Debounce hook ──
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const serialized = JSON.stringify(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, delay]);
  return debounced;
}

// ── Route Badge ──
function RouteTypeBadge({ routeType }: { routeType: string }) {
  const isIntra = routeType === "INTRA_ZONE";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded border ${
      isIntra 
        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
        : "bg-blue-50 text-[#0033a0] border-[#0033a0]/20"
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {isIntra ? "Intra-Zone" : "Inter-Zone"}
    </span>
  );
}

// ── Skeleton loader ──
function PriceSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="h-px bg-slate-100" />
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Price breakdown card (Looks like an invoice) ──
function PriceBreakdownCard({ price }: { price: PriceBreakdown }) {
  const fmt = (n: number) => `₹${n.toFixed(2)}`;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-300 shadow-lg overflow-hidden"
    >
      <div className="bg-[#f4f7fb] px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#0033a0]">
          <FileText className="w-5 h-5" />
          <span className="text-sm font-bold">Pro-forma Invoice</span>
        </div>
        <RouteTypeBadge routeType={price.routeType} />
      </div>

      <div className="p-5 space-y-5">
        {/* Weight breakdown */}
        <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-2 border border-slate-200">
          <div className="text-center">
            <div className="font-mono text-sm font-bold text-slate-700">{price.weights.actualWeightKg}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Actual</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <div className="font-mono text-sm font-bold text-slate-700">{price.weights.volumetricWeightKg}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Volumetric</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-sm font-bold text-[#0033a0] flex items-center justify-center gap-1">
              {price.weights.billableWeightKg} <CheckCircle2 className="w-3 h-3" />
            </div>
            <div className="text-[10px] text-[#0033a0]/80 font-bold uppercase tracking-wider mt-1">Billable</div>
          </div>
        </div>

        {/* Charge breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Base charge ({price.routeType === "INTRA_ZONE" ? "intra" : "inter"}-zone)</span>
            <span className="font-mono text-slate-800">{fmt(price.baseCharge)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Weight charge ({price.weights.billableWeightKg} kg)</span>
            <span className="font-mono text-slate-800">{fmt(price.weightCharge)}</span>
          </div>
          {price.codSurcharge > 0 && (
            <div className="flex justify-between text-[#0033a0] font-semibold">
              <span>COD surcharge</span>
              <span className="font-mono">{fmt(price.codSurcharge)}</span>
            </div>
          )}
        </div>

        <div className="h-px bg-slate-200" />

        <div className="flex justify-between items-center">
          <span className="text-sm font-black text-slate-800 tracking-wide uppercase">Total Amount</span>
          <span className="text-2xl font-black text-[#0033a0] font-mono">
            {fmt(price.totalCharge)}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 font-medium">
          * Final price locked upon waybill generation. Rate card v{price.rateCardVersion} applies.
        </p>
      </div>
    </motion.div>
  );
}

// ── Form field wrapper ──
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700 tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{error}</p>}
    </div>
  );
}

const inputCls = "w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0033a0] focus:ring-2 focus:ring-[#0033a0]/20 transition-all shadow-sm";
const selectCls = inputCls + " appearance-none";

import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Ensure you replace this with your actual Stripe publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_mock");

// =============================================================================
// MAIN COMPONENT & TYPES
// =============================================================================
interface FormValues {
  lengthCm: string; breadthCm: string; heightCm: string; actualWeightKg: string;
  businessType: BusinessType;
  pickupAreaId: string; dropAreaId: string;
  pickupStreet: string; pickupCity: string; pickupState: string;
  dropStreet: string; dropCity: string; dropState: string;
  paymentType: PaymentType; codCollectAmount: string;
}

const INITIAL: FormValues = {
  lengthCm: "", breadthCm: "", heightCm: "", actualWeightKg: "",
  businessType: "B2C",
  pickupAreaId: "", dropAreaId: "",
  pickupStreet: "", pickupCity: "", pickupState: "",
  dropStreet: "", dropCity: "", dropState: "",
  paymentType: "PREPAID",
  codCollectAmount: "",
};

// ── Stripe Checkout Form Component ──
function StripeCheckoutForm({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "An error occurred.");
      setProcessing(false);
      return;
    }

    // In a real app, confirmPayment will redirect to return_url.
    // For this prototype, we'll mock a successful payment flow or use redirect="if_required".
    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <div className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
          {error}
        </div>
      )}
      <button 
        type="submit" disabled={!stripe || processing}
        className="w-full bg-[#0033a0] hover:bg-[#002277] text-white font-bold py-3.5 rounded-lg transition-colors shadow-md disabled:opacity-50"
      >
        {processing ? "Processing Payment..." : "Pay Now"}
      </button>
    </form>
  );
}

export default function CreateOrderForm({ onSuccess }: { onSuccess?: (orderId: string) => void }) {
  const [form, setForm] = useState<FormValues>(INITIAL);
  const [areas, setAreas] = useState<Area[]>([]);
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const rateInputs = {
    l: form.lengthCm, b: form.breadthCm, h: form.heightCm,
    w: form.actualWeightKg, type: form.businessType,
    pickup: form.pickupAreaId, drop: form.dropAreaId,
    payment: form.paymentType, cod: form.codCollectAmount,
  };
  const debouncedInputs = useDebounce(rateInputs, 400);

  useEffect(() => {
    adminApi.zones().then((r) => {
      const allAreas: Area[] = (r.data.data as ZoneWithAreas[]).flatMap(
        (z) => z.areas.map((a) => ({ ...a, zone: z }))
      );
      setAreas(allAreas);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const { l, b, h, w, type, pickup, drop, payment, cod } = debouncedInputs;
    if (!l || !b || !h || !w || !pickup || !drop) {
      setPrice(null);
      setPriceError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPriceLoading(true);
    setPriceError(null);

    rateApi.calculate({
      pickupAreaId: pickup, dropAreaId: drop,
      lengthCm: parseFloat(l), breadthCm: parseFloat(b), heightCm: parseFloat(h), actualWeightKg: parseFloat(w),
      businessType: type, paymentType: payment,
      codCollectAmount: payment === "COD" ? parseFloat(cod || "0") : 0,
    })
      .then((r) => { setPrice(r.data); setPriceError(null); })
      .catch((err) => {
        if (err.name !== "CanceledError") {
          setPriceError(err.response?.data?.error ?? "Rate calculation failed.");
          setPrice(null);
        }
      })
      .finally(() => setPriceLoading(false));

    return () => controller.abort();
  }, [debouncedInputs]);

  const set = (key: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await ordersApi.create({
        pickupAreaId: form.pickupAreaId, dropAreaId: form.dropAreaId,
        lengthCm: parseFloat(form.lengthCm), breadthCm: parseFloat(form.breadthCm), heightCm: parseFloat(form.heightCm), actualWeightKg: parseFloat(form.actualWeightKg),
        businessType: form.businessType, paymentType: form.paymentType,
        codCollectAmount: form.paymentType === "COD" ? parseFloat(form.codCollectAmount) : undefined,
        pickupAddressData: { street: form.pickupStreet, city: form.pickupCity, state: form.pickupState, pincode: areas.find(a => a.id === form.pickupAreaId)?.pincode ?? "" },
        dropAddressData: { street: form.dropStreet, city: form.dropCity, state: form.dropState, pincode: areas.find(a => a.id === form.dropAreaId)?.pincode ?? "" },
      });
      
      const orderId = res.data.order.id;
      setCreatedOrderId(orderId);

      if (form.paymentType === "PREPAID") {
        // Fetch PaymentIntent client secret
        const payRes = await ordersApi.pay(orderId);
        setClientSecret(payRes.data.clientSecret);
        setStep(4);
      } else {
        // COD
        onSuccess?.(orderId);
      }
    } catch (err) {
      const errorMsg = err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setSubmitError(errorMsg ?? "Failed to process waybill.");
    } finally {
      setSubmitting(false);
    }
  };

  const canCalculate = form.lengthCm && form.breadthCm && form.heightCm && form.actualWeightKg && form.pickupAreaId && form.dropAreaId;
  const steps = [
    { num: 1, label: "Parcel Specs", icon: Package },
    { num: 2, label: "Routing", icon: MapPin },
    { num: 3, label: "Billing", icon: CreditCard }
  ];

  if (step === 4 && clientSecret) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-800">Complete Payment</h2>
            <p className="text-slate-500 font-medium">Please enter your card details below to finalize the waybill.</p>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <StripeCheckoutForm clientSecret={clientSecret} onSuccess={() => onSuccess?.(createdOrderId!)} />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── Corporate Step Tabs ── */}
      <div className="flex mb-8 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
        {steps.map((s) => {
          const active = step === s.num;
          return (
            <button
              key={s.num} type="button" onClick={() => setStep(s.num as 1 | 2 | 3)}
              className="flex-1 relative py-2.5 rounded-lg text-sm font-bold transition-all"
            >
              {active && (
                <motion.div layoutId="activeTabCorporate" className="absolute inset-0 bg-[#0033a0] rounded-lg" transition={{ type: "spring", bounce: 0.1, duration: 0.5 }} />
              )}
              <div className={`relative z-10 flex items-center justify-center gap-2 ${active ? "text-white" : "text-slate-500 hover:text-slate-800"}`}>
                <s.icon className="w-4 h-4" />
                {s.label}
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          
          {/* ── STEP 1: PARCEL ── */}
          {step === 1 && (
            <motion.div
              key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
              className="space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Consignment Specifications</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <Field label="Business Type">
                  <select className={selectCls} value={form.businessType} onChange={set("businessType")}>
                    <option value="B2C">B2C — Consumer</option>
                    <option value="B2B">B2B — Commercial</option>
                  </select>
                </Field>
                <Field label="Actual Weight (kg)">
                  <input type="number" min="0.1" step="0.1" placeholder="e.g. 2.5" className={inputCls} value={form.actualWeightKg} onChange={set("actualWeightKg")} />
                </Field>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 tracking-wide">Dimensions (cm)</label>
                <div className="grid grid-cols-3 gap-4">
                  {(["lengthCm", "breadthCm", "heightCm"] as const).map((k, i) => (
                    <input key={k} type="number" min="1" step="0.1" placeholder={["Length", "Breadth", "Height"][i]} className={inputCls} value={form[k]} onChange={set(k)} />
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {form.lengthCm && form.breadthCm && form.heightCm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 text-sm text-[#0033a0] bg-[#f4f7fb] px-4 py-3 rounded-lg border border-[#0033a0]/20 overflow-hidden">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <span>Volumetric Weight: <strong className="font-mono bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200 ml-1">{((parseFloat(form.lengthCm) * parseFloat(form.breadthCm) * parseFloat(form.heightCm)) / 5000).toFixed(2)} kg</strong></span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setStep(2)} className="w-full bg-[#ffc000] text-[#0033a0] hover:bg-[#e6ad00] font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                  Proceed to Routing <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: ADDRESSES ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><MapPin className="w-4 h-4 text-emerald-600"/> Origin Facility / Sender</h3>
                  <Field label="Pickup Area">
                    <select className={selectCls} value={form.pickupAreaId} onChange={set("pickupAreaId")}>
                      <option value="">Select origin...</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.pincode} ({a.zone.code})</option>)}
                    </select>
                  </Field>
                  <Field label="Address Line 1"><input className={inputCls} placeholder="Building, Street" value={form.pickupStreet} onChange={set("pickupStreet")} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City"><input className={inputCls} placeholder="City" value={form.pickupCity} onChange={set("pickupCity")} /></Field>
                    <Field label="State"><input className={inputCls} placeholder="State" value={form.pickupState} onChange={set("pickupState")} /></Field>
                  </div>
                </div>

                {/* Drop */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><MapPin className="w-4 h-4 text-rose-600"/> Destination / Receiver</h3>
                  <Field label="Drop Area">
                    <select className={selectCls} value={form.dropAreaId} onChange={set("dropAreaId")}>
                      <option value="">Select destination...</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.pincode} ({a.zone.code})</option>)}
                    </select>
                  </Field>
                  <Field label="Address Line 1"><input className={inputCls} placeholder="Building, Street" value={form.dropStreet} onChange={set("dropStreet")} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City"><input className={inputCls} placeholder="City" value={form.dropCity} onChange={set("dropCity")} /></Field>
                    <Field label="State"><input className={inputCls} placeholder="State" value={form.dropState} onChange={set("dropState")} /></Field>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-lg transition border border-slate-300 flex items-center justify-center gap-2 shadow-sm">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={() => setStep(3)} disabled={!form.pickupAreaId || !form.dropAreaId} className="flex-[2] bg-[#ffc000] hover:bg-[#e6ad00] text-[#0033a0] font-bold py-3.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                  Proceed to Billing <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: PAYMENT ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Billing Information</h2>

                <div className="grid grid-cols-2 gap-6">
                  <Field label="Payment Terms">
                    <select className={selectCls} value={form.paymentType} onChange={set("paymentType")}>
                      <option value="PREPAID">Prepaid</option>
                      <option value="COD">Cash on Delivery (COD)</option>
                    </select>
                  </Field>
                  {form.paymentType === "COD" && (
                    <Field label="COD Value to Collect (₹)">
                      <input type="number" min="0" step="0.01" placeholder="e.g. 1500" className={inputCls} value={form.codCollectAmount} onChange={set("codCollectAmount")} />
                    </Field>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  {!canCalculate && (
                    <div className="text-center text-sm font-medium text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-8">
                      Incomplete specs/routing. Please fill previous steps to generate a waybill.
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    {canCalculate && priceLoading && <PriceSkeleton key="loading" />}
                    {canCalculate && priceError && (
                      <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-5 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5"/> {priceError}
                      </motion.div>
                    )}
                    {canCalculate && !priceLoading && price && (
                      <PriceBreakdownCard key="price" price={price} />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {submitError && (
                <div className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5"/> {submitError}
                </div>
              )}

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(2)} className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-lg transition border border-slate-300 flex items-center justify-center gap-2 shadow-sm">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={!price || submitting || priceLoading} className="flex-[2] relative overflow-hidden bg-[#0033a0] hover:bg-[#002277] text-white font-bold py-3.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                  {submitting ? (
                    <span className="flex items-center gap-2"><span className="animate-spin"><Package className="w-4 h-4"/></span> Processing Waybill...</span>
                  ) : price ? (
                    <>Generate Waybill — ₹{price.totalCharge.toFixed(2)}</>
                  ) : (
                    "Complete Details"
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
