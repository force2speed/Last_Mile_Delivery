"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Map, 
  Package, 
  PlusCircle, 
  LogOut,
  Menu,
  X,
  Truck,
  User as UserIcon,
  ChevronDown,
  BarChart3
} from "lucide-react";
import type { Role, User } from "../../types";

type LinkItem = { label: string; href: string; icon: React.ReactNode };

const ROLE_LINKS: Record<Role, LinkItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Analytics", href: "/admin/reports", icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Rate Cards", href: "/admin/rate-cards", icon: <CreditCard className="w-4 h-4" /> },
    { label: "Delivery Agents", href: "/admin/agents", icon: <Users className="w-4 h-4" /> },
    { label: "Zones & Areas", href: "/admin/zones", icon: <Map className="w-4 h-4" /> },
  ],
  CUSTOMER: [
    { label: "My Shipments", href: "/customer", icon: <Package className="w-4 h-4" /> },
    { label: "Create Shipment", href: "/customer/orders/new", icon: <PlusCircle className="w-4 h-4" /> },
  ],
  DELIVERY_AGENT: [
    { label: "My Route", href: "/agent", icon: <Truck className="w-4 h-4" /> },
  ],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("lmd_token");
    const storedUser = localStorage.getItem("lmd_user");

    if (!token || !storedUser) {
      localStorage.removeItem("lmd_token");
      localStorage.removeItem("lmd_user");
      router.push("/login");
    } else {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("lmd_token");
    localStorage.removeItem("lmd_user");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <Truck className="w-10 h-10 text-[#0033a0]" />
        </motion.div>
      </div>
    );
  }

  const role = user?.role || "CUSTOMER";
  const links = ROLE_LINKS[role as Role] || [];
  const initials = user?.fullName ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "US";

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 flex flex-col font-sans selection:bg-[#ffc000]/30 selection:text-black relative">
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 bg-repeat bg-center"
        style={{ backgroundImage: "url('/images/bg_pattern.jpg')", backgroundSize: "800px" }}
      />

      {/* ── Top Navigation Bar ── */}
      <header className="bg-[#0033a0] text-white shadow-md z-40 sticky top-0">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-[#ffc000] p-1.5 rounded-md shadow-sm">
                <Truck className="w-5 h-5 text-[#0033a0]" strokeWidth={2.5} />
              </div>
              <span className="font-black text-xl tracking-tight leading-none hidden sm:block">LastMile</span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-2 flex-1 justify-center px-8">
              {links.map((link) => {
                const active = pathname === link.href || (link.href !== `/${role.toLowerCase()}` && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href} href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all relative ${
                      active ? "text-[#ffc000] bg-white/10" : "text-[#d0dcf2] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                    {active && <motion.div layoutId="navIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffc000]" />}
                  </Link>
                );
              })}
            </nav>

            {/* User Profile & Mobile Toggle */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 border-l border-white/20 pl-4 relative">
                <div className="text-right">
                  <div className="text-sm font-bold text-white leading-tight">{user?.fullName}</div>
                  <div className="text-[10px] text-[#ffc000] font-black uppercase tracking-widest mt-0.5">{role.replace("_", " ")}</div>
                </div>
                
                {/* Profile Dropdown Toggle */}
                <button 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-[#002277] hover:bg-white/10 border border-white/10 transition-colors shadow-inner"
                >
                  <span className="text-sm font-black text-white">{initials}</span>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-slate-800"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Signed in as</p>
                        <p className="text-sm font-bold truncate">{user?.email}</p>
                      </div>
                      <Link 
                        href="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition border-b border-slate-100"
                      >
                        <UserIcon className="w-4 h-4" /> Account Settings
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white hover:text-[#ffc000] p-1.5"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 md:hidden flex justify-end"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-72 bg-white h-full shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-[#0033a0] p-6 text-white">
                <div className="w-12 h-12 rounded-full bg-[#ffc000] flex items-center justify-center font-black text-[#0033a0] text-lg mb-3 shadow-md">
                  {initials}
                </div>
                <div className="font-bold text-sm text-white">{user?.fullName}</div>
                <div className="text-[10px] uppercase text-[#ffc000] font-black tracking-widest mt-1">{role.replace("_", " ")}</div>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                {links.map((link) => (
                  <Link
                    key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition ${
                      pathname === link.href ? "bg-[#0033a0]/10 text-[#0033a0]" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{link.icon}</span> {link.label}
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-slate-100">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold py-3 rounded-lg transition text-sm">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ── */}
      <main className="flex-grow flex flex-col relative w-full overflow-x-hidden">
        <div className="flex-grow p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#0033a0] border-t border-[#002277] mt-auto z-10 relative">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Branding & Description */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="bg-[#ffc000] p-1.5 rounded-md shadow-sm">
                  <Truck className="w-4 h-4 text-[#0033a0]" strokeWidth={2.5} />
                </div>
                <span className="text-lg font-black tracking-tight">LastMile Logistics</span>
              </div>
              <p className="text-[#d0dcf2] text-xs font-medium leading-relaxed max-w-sm">
                The ultimate enterprise platform for orchestrating last-mile deliveries, tracking agents in real-time, and managing cross-zone logistics dynamically.
              </p>
            </div>

            {/* Copyright */}
            <div className="text-center text-xs text-[#d0dcf2] font-medium">
              &copy; {new Date().getFullYear()} LastMile Logistics Inc.<br/>All rights reserved.<br/>
              <span className="text-[#ffc000] font-bold mt-1 inline-block">Made by dhruv dhoundiyal</span>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-end gap-4 text-xs font-bold text-[#ffc000]">
              <Link href="/guide" className="hover:text-white transition-colors underline-offset-4 hover:underline">User Guide</Link>
              <Link href="/privacy" className="hover:text-white transition-colors underline-offset-4 hover:underline">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors underline-offset-4 hover:underline">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
