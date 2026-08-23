"use client";
import React, { useState, useEffect } from "react";
import { User, Phone, Lock, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { authApi } from "../../../lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authApi.me();
        setFormData(prev => ({
          ...prev,
          fullName: res.data.user.fullName || "",
          phone: res.data.user.phone || "",
        }));
      } catch (err) {
        console.error("Failed to load user data");
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const updatePayload: any = {
        fullName: formData.fullName,
        phone: formData.phone,
      };

      if (formData.newPassword) {
        if (!formData.currentPassword) {
          throw new Error("Current password is required to set a new password.");
        }
        updatePayload.currentPassword = formData.currentPassword;
        updatePayload.newPassword = formData.newPassword;
      }

      const res = await authApi.updateMe(updatePayload);
      
      // Update local storage user data to reflect new name
      const storedUser = localStorage.getItem("lmd_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.fullName = res.data.user.fullName;
        localStorage.setItem("lmd_user", JSON.stringify(parsed));
        // Force a window event to let layout know if we had a listener, 
        // for now reloading is a simple way to update the header.
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err: any) {
      setMessage({ 
        type: "error", 
        text: err.response?.data?.error || err.message || "An error occurred." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage your personal profile and security preferences.</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm border ${
              message.type === "success" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : "bg-rose-50 text-rose-600 border-rose-100"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        
        {/* Personal Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Personal Information</h2>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" name="fullName" required
                  value={formData.fullName} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0033a0] focus:ring-4 focus:ring-[#0033a0]/10 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel" name="phone" required
                  value={formData.phone} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0033a0] focus:ring-4 focus:ring-[#0033a0]/10 transition-all font-medium text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Security (Optional)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password" name="currentPassword"
                  value={formData.currentPassword} onChange={handleChange}
                  placeholder="Leave blank to keep current"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0033a0] focus:ring-4 focus:ring-[#0033a0]/10 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password" name="newPassword"
                  value={formData.newPassword} onChange={handleChange}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0033a0] focus:ring-4 focus:ring-[#0033a0]/10 transition-all font-medium text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit" disabled={loading}
            className="bg-[#0033a0] hover:bg-[#002277] disabled:bg-slate-300 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-md disabled:shadow-none flex items-center gap-2"
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Save className="w-4 h-4" />
              </motion.div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
