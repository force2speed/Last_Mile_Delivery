"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { Truck, Lock, Mail, ArrowRight, ShieldCheck, Globe, Clock } from "lucide-react";
import { authApi } from "../../../lib/api";
import type { Role } from "../../../types";

const ROLE_REDIRECT: Record<Role, string> = {
  ADMIN: "/admin",
  CUSTOMER: "/customer",
  DELIVERY_AGENT: "/agent",
};

// ── Corporate Hero Component with AI Image ──
function CorporateHero() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-white p-12 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{ backgroundImage: "url('/images/delivery_truck.jpg')" }} 
      />
      {/* Gradient Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0033a0] via-[#0033a0]/90 to-[#0033a0]/40 mix-blend-multiply" />
      <div className="absolute inset-0 bg-[#0033a0]/40 backdrop-blur-[2px]" />
      
      <div className="z-10 w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="w-20 h-20 bg-[#ffc000] rounded-2xl flex items-center justify-center shadow-2xl mb-6 border-4 border-white/20">
            <Truck className="w-10 h-10 text-[#0033a0]" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black tracking-tight leading-tight mb-4 drop-shadow-xl text-white">
            Reliable.<br />Secure.<br />Global.
          </h1>
          <p className="text-lg text-white/90 font-medium leading-relaxed drop-shadow-md">
            Access the LastMile enterprise logistics portal to manage your shipments, track deliveries, and orchestrate your supply chain.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="grid grid-cols-1 gap-6 pt-8 border-t border-white/30">
          {[
            { icon: ShieldCheck, title: "Enterprise Security", desc: "Bank-grade encryption for your logistics data." },
            { icon: Globe, title: "Global Reach", desc: "Seamless cross-border orchestration." },
            { icon: Clock, title: "Real-time Tracking", desc: "Live updates at every step of the journey." },
          ].map((Item, i) => (
            <div key={i} className="flex items-center gap-4 bg-black/20 p-4 rounded-xl backdrop-blur-md border border-white/10">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Item.icon className="w-6 h-6 text-[#ffc000]" />
              </div>
              <div>
                <h3 className="font-bold text-white">{Item.title}</h3>
                <p className="text-sm text-white/80">{Item.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(form);
      localStorage.setItem("lmd_token", res.data.token);
      localStorage.setItem("lmd_user", JSON.stringify(res.data.user));
      router.push(ROLE_REDIRECT[res.data.user.role as Role] ?? "/");
    } catch (err) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setError(errorMsg ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col md:flex-row font-sans selection:bg-[#ffc000]/30 selection:text-black">
      {/* Left side: Corporate Hero */}
      <div className="hidden md:flex flex-1 relative shadow-2xl z-10">
        <CorporateHero />
      </div>

      {/* Right side: Clean Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl border border-slate-200"
        >
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <Truck className="w-8 h-8 text-[#0033a0]" />
            <span className="text-2xl font-black text-[#0033a0]">LastMile</span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sign In</h2>
            <p className="text-sm text-slate-500 font-medium">Access your logistics dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#0033a0] transition-colors" />
                <input
                  type="email" required autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0033a0] focus:ring-2 focus:ring-[#0033a0]/20 transition-all shadow-sm"
                  placeholder="name@company.com"
                  value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#0033a0] transition-colors" />
                <input
                  type="password" required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0033a0] focus:ring-2 focus:ring-[#0033a0]/20 transition-all shadow-sm"
                  placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-600 text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> {error}
              </motion.div>
            )}

            <button
              type="submit" disabled={loading}
              className="group w-full relative overflow-hidden bg-[#0033a0] hover:bg-[#002277] text-white font-bold py-3.5 rounded-lg transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 mt-6 shadow-md"
            >
              {loading ? "Authenticating..." : (
                <>
                  Secure Login
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-slate-500 font-bold">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  try {
                    setLoading(true);
                    if (credentialResponse.credential) {
                      const res = await authApi.googleLogin(credentialResponse.credential);
                      localStorage.setItem("lmd_token", res.data.token);
                      localStorage.setItem("lmd_user", JSON.stringify(res.data.user));
                      router.push(ROLE_REDIRECT[res.data.user.role as Role] ?? "/");
                    }
                  } catch (err: any) {
                    setError("Google Login failed.");
                  } finally {
                    setLoading(false);
                  }
                }}
                onError={() => {
                  setError("Google Login failed.");
                }}
                theme="outline"
                size="large"
                shape="rectangular"
              />
            </div>
          </div>

          <div className="text-center text-slate-500 text-sm mt-8 pt-6 border-t border-slate-100">
            Don't have an account?{" "}
            <Link href="/register" className="text-[#0033a0] hover:text-[#002277] font-bold transition-colors underline decoration-[#0033a0]/30 underline-offset-4">
              Register Company
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
