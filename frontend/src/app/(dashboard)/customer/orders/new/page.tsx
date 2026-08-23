"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CreateOrderForm from "../../../../../components/orders/CreateOrderForm";

export default function NewOrderPage() {
  const router = useRouter();
  return (
    <div className="space-y-6 font-sans max-w-3xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Book Delivery
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5 tracking-wide">
            ENTER PARCEL SPECS AND GET LIVE PRICING SNAPSHOTS
          </p>
        </div>
        <Link
          href="/customer"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/50 transition cursor-pointer select-none"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Main Form container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <CreateOrderForm onSuccess={() => router.push(`/customer`)} />
      </div>
    </div>
  );
}
