import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RiShoppingCart2Line } from 'react-icons/ri';
import Login from './Login';
import SignUp from './SignUp';

const AuthLanding = ({ onLogin, onSignUp }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);
  const [signupStep, setSignupStep] = useState(() => {
    try {
      const raw = sessionStorage.getItem('signupDraft');
      if (!raw) return 1;
      const draft = JSON.parse(raw);
      const s = Number(draft?.step || 1);
      if (!Number.isFinite(s)) return 1;
      return Math.min(4, Math.max(1, s));
    } catch {
      return 1;
    }
  });
  const [progressPulse, setProgressPulse] = useState(false);

  const mode = useMemo(() => {
    if (location.pathname === '/signup') return 'signup';
    return 'login';
  }, [location.pathname]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setTransitionsEnabled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setProgressPulse(true);
    const t = setTimeout(() => setProgressPulse(false), 360);
    return () => clearTimeout(t);
  }, [signupStep]);

  const phoneDemos = useMemo(() => ([
    {
      title: 'Today',
      itemsSold: 134,
      itemsDelta: '+11%',
      margin: 33.6,
      marginDelta: '+3%',
      trendLabel: 'Growing',
      trend: [0.22, 0.33, 0.28, 0.46, 0.64, 0.58, 0.72],
      profitYear: '2024',
      profitTrend: [0.22, 0.26, 0.3, 0.28, 0.35, 0.42, 0.45, 0.5, 0.56, 0.61, 0.67, 0.72],
      bars: [
        { rev: 30, exp: 18 },
        { rev: 36, exp: 22 },
        { rev: 34, exp: 20 },
        { rev: 40, exp: 26 },
        { rev: 46, exp: 30 },
        { rev: 52, exp: 34 }
      ]
    },
    {
      title: 'This Week',
      itemsSold: 812,
      itemsDelta: '+7%',
      margin: 29.4,
      marginDelta: '+2%',
      trendLabel: 'Stable',
      trend: [0.35, 0.38, 0.34, 0.42, 0.48, 0.46, 0.5],
      profitYear: '2024',
      profitTrend: [0.3, 0.33, 0.31, 0.34, 0.36, 0.38, 0.37, 0.39, 0.42, 0.44, 0.46, 0.48],
      bars: [
        { rev: 42, exp: 28 },
        { rev: 38, exp: 26 },
        { rev: 48, exp: 32 },
        { rev: 44, exp: 30 },
        { rev: 50, exp: 34 },
        { rev: 46, exp: 31 }
      ]
    },
    {
      title: 'Last 30 Days',
      itemsSold: 3890,
      itemsDelta: '+14%',
      margin: 36.1,
      marginDelta: '+5%',
      trendLabel: 'Scaling',
      trend: [0.18, 0.24, 0.32, 0.41, 0.55, 0.63, 0.7],
      profitYear: '2024',
      profitTrend: [0.18, 0.21, 0.25, 0.29, 0.33, 0.39, 0.44, 0.49, 0.55, 0.6, 0.66, 0.71],
      bars: [
        { rev: 28, exp: 16 },
        { rev: 34, exp: 18 },
        { rev: 40, exp: 21 },
        { rev: 46, exp: 24 },
        { rev: 52, exp: 28 },
        { rev: 58, exp: 32 }
      ]
    }
  ]), []);

  const [phoneDemoIndex, setPhoneDemoIndex] = useState(0);
  const [phonePulse, setPhonePulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPhoneDemoIndex((i) => (i + 1) % phoneDemos.length), 3200);
    return () => clearInterval(t);
  }, [phoneDemos.length]);

  useEffect(() => {
    setPhonePulse(true);
    const t = setTimeout(() => setPhonePulse(false), 320);
    return () => clearTimeout(t);
  }, [phoneDemoIndex]);

  const activeDemo = phoneDemos[phoneDemoIndex] || phoneDemos[0];
  const batteryLevel = [0.72, 0.58, 0.84][phoneDemoIndex % 3];
  const trendPoints = activeDemo.trend || [];
  const trendWidth = 240;
  const trendHeight = 80;
  const trendPadding = 10;
  const trendXStep = trendPoints.length > 1 ? (trendWidth - trendPadding * 2) / (trendPoints.length - 1) : 0;
  const trendCoords = trendPoints.map((v, idx) => {
    const x = trendPadding + idx * trendXStep;
    const y = Math.round((trendHeight - trendPadding) - v * (trendHeight - trendPadding * 2));
    return { x, y };
  });
  const trendPath = trendCoords.length ? `M ${trendCoords.map((p) => `${p.x} ${p.y}`).join(' L ')}` : '';
  const trendAreaPath = trendCoords.length ? `${trendPath} L ${trendPadding + (trendCoords.length - 1) * trendXStep} ${trendHeight} L ${trendPadding} ${trendHeight} Z` : '';

  const profitPoints = activeDemo.profitTrend || [];
  const profitWidth = 240;
  const profitHeight = 80;
  const profitPadding = 10;
  const profitXStep = profitPoints.length > 1 ? (profitWidth - profitPadding * 2) / (profitPoints.length - 1) : 0;
  const profitCoords = profitPoints.map((v, idx) => {
    const x = profitPadding + idx * profitXStep;
    const y = Math.round((profitHeight - profitPadding) - v * (profitHeight - profitPadding * 2));
    return { x, y };
  });
  const profitPath = profitCoords.length ? `M ${profitCoords.map((p) => `${p.x} ${p.y}`).join(' L ')}` : '';
  const profitAreaPath = profitCoords.length ? `${profitPath} L ${profitPadding + (profitCoords.length - 1) * profitXStep} ${profitHeight} L ${profitPadding} ${profitHeight} Z` : '';

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-gray-50 grid grid-cols-1 md:grid-cols-2">
      <div className="relative overflow-hidden min-h-[560px] md:min-h-0">
        <div className="absolute inset-0">
          <div
            className={`absolute inset-0 ${transitionsEnabled ? 'transition-opacity duration-500 ease-in-out' : ''} ${
              mode === 'login' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/istockphoto-1475954281-612x612.jpg')" }}
            />
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute top-4 left-6 z-10">
              <div className="inline-flex items-end gap-4 leading-none drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
                <span className="text-6xl font-extrabold tracking-tight text-green-300">Duka</span>
                <span className="relative text-6xl font-extrabold tracking-tight text-white pr-12">
                  Hubnow
                  <span className="absolute -top-3 right-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600 shadow-md shadow-black/30">
                    <RiShoppingCart2Line className="text-white" size={18} />
                  </span>
                </span>
              </div>
            </div>
            <div className="absolute inset-0 z-0 flex items-stretch justify-start px-10">
              <style>{`
                @media (prefers-reduced-motion: reduce) {
                  .auth-hero-pop {
                    animation: none !important;
                  }
                }
                @keyframes authHeroPopIn {
                  0% { opacity: 0; transform: scale(0.96); }
                  100% { opacity: 1; transform: scale(1); }
                }
                @keyframes authHeroNotify {
                  0% { opacity: 0; transform: scale(0.96); }
                  14% { opacity: 1; transform: scale(1); }
                  78% { opacity: 1; transform: scale(1); }
                  100% { opacity: 0; transform: scale(0.96); }
                }
                .auth-hero-pop.a { animation: authHeroPopIn 520ms ease-out both, authHeroNotify 7.4s ease-in-out 1.4s infinite; }
                .auth-hero-pop.b { animation: authHeroPopIn 600ms ease-out both, authHeroNotify 7.4s ease-in-out 2.2s infinite; }
              `}</style>
              <div className="relative w-full h-full">
                <div className="w-[26rem] text-left h-full flex flex-col pt-36 xl:pt-32 pb-12">
                  <div>
                    <h1 className="text-5xl font-bold leading-[0.98] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
                      <span className="block">Start Selling <span className="text-green-300">Smarter</span></span>
                      <span className="block">Today</span>
                      <span className="block mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_22px_rgba(0,0,0,0.7)]">
                        <span className="block">All-in-one POS</span>
                        <span className="block text-green-300">Shops</span>
                        <span className="block">Inventory</span>
                        <span className="block">and reports</span>
                      </span>
                    </h1>
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="text-sm text-white/80 font-semibold drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                      Get reports for your business — connecting with us
                    </div>
                    <div className="text-sm text-white/70 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                      Set up your point of sale system in minutes.
                      <br />
                      Manage sales, inventory, and reports all in one place.
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none">
                  <div className="absolute right-[2.5rem] top-[48%] xl:right-[3.5rem] 2xl:right-[5rem] flex items-center gap-10">
                    <div className="auth-hero-pop a">
                      <div className="relative">
                        <div className="absolute -inset-8 rounded-[2.6rem] bg-gradient-to-br from-green-400/25 via-emerald-400/10 to-transparent blur-2xl" />
                        <div className="w-[14rem] rounded-2xl bg-white/92 shadow-[0_28px_90px_rgba(0,0,0,0.5)] border border-white/35 backdrop-blur-md p-2 ring-1 ring-white/35 transform rotate-12 origin-bottom-left">
                          <div className="flex items-center justify-between">
                            <div className="text-gray-900 font-semibold text-xs">Monthly Statistics</div>
                            <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">May</div>
                          </div>
                          <div className="mt-2 grid grid-cols-4 gap-1.5 h-10 items-end">
                            <div className="bg-green-200 rounded-md" style={{ height: '60%' }} />
                            <div className="bg-orange-200 rounded-md" style={{ height: '80%' }} />
                            <div className="bg-pink-200 rounded-md" style={{ height: '45%' }} />
                            <div className="bg-blue-200 rounded-md" style={{ height: '70%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="auth-hero-pop b">
                      <div className="relative">
                        <div className="absolute -inset-8 rounded-[2.6rem] bg-gradient-to-br from-sky-400/22 via-blue-400/10 to-transparent blur-2xl" />
                        <div className="w-[12.5rem] rounded-2xl bg-white/92 shadow-[0_28px_90px_rgba(0,0,0,0.5)] border border-white/35 backdrop-blur-md p-1.5 ring-1 ring-white/35 transform -rotate-12 origin-bottom-right">
                          <div className="text-gray-900 font-semibold text-xs mb-2">Overview</div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-2 py-1.5">
                              <span className="text-gray-700 text-xs">Sales</span>
                              <span className="text-green-700 text-xs font-semibold">TZS 548,915</span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-2 py-1.5">
                              <span className="text-gray-700 text-xs">Orders</span>
                              <span className="text-blue-700 text-xs font-semibold">367</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`absolute inset-0 ${transitionsEnabled ? 'transition-opacity duration-500 ease-in-out' : ''} ${
              mode === 'signup' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-950 via-green-900 to-green-800" />
            <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-white/10" />
            <div className="absolute -bottom-56 -left-56 w-[680px] h-[680px] rounded-full bg-black/15" />
            <div className="absolute top-8 left-8 right-8">
              <div className="inline-flex items-end gap-4 leading-none drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
                <span className="text-5xl font-extrabold tracking-tight text-green-300">Duka</span>
                <span className="relative text-5xl font-extrabold tracking-tight text-white pr-12">
                  Hubnow
                  <span className="absolute -top-3 right-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600 shadow-md shadow-black/30">
                    <RiShoppingCart2Line className="text-white" size={18} />
                  </span>
                </span>
              </div>
            </div>
            <div className="absolute inset-0 flex items-start justify-start px-10 pt-20">
              <div className="w-full">
                <div className="w-full max-w-md">
                <div className="relative mt-6 mb-6 h-[440px]">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                    <div className="text-6xl font-extrabold leading-[0.92] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
                      <div>Start Selling</div>
                      <div className="text-green-300">Smarter</div>
                      <div>Today</div>
                    </div>
                    <div className="mt-7 text-5xl font-extrabold leading-[0.98] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
                      <div>Run Your <span className="text-green-300">Business</span></div>
                      <div>From Your</div>
                      <div className="text-green-300">Phone</div>
                    </div>
                  </div>
                  <div className="absolute -right-80 top-[56%] -translate-y-1/2 z-20">
                    <div className="relative w-[268px] h-[498px] 2xl:w-[304px] 2xl:h-[570px] drop-shadow-[0_28px_60px_rgba(0,0,0,0.55)]">
                      <div className="absolute inset-0 rounded-[3.2rem] bg-black/80 border border-white/10" />
                      <div className="absolute inset-[10px] rounded-[2.7rem] bg-white overflow-hidden">
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-black/90" />
                        <div className={`px-4 pt-7 pb-4 transition-all duration-500 ${phonePulse ? 'scale-[1.01]' : 'scale-100'}`}>
                          <div className="flex items-center justify-between text-xs text-gray-700 font-semibold">
                            <div className="tabular-nums">9:41</div>
                            <div className="flex items-center gap-2">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-900">
                                <path fill="currentColor" d="M3 18h2v-3H3v3Zm4 0h2v-5H7v5Zm4 0h2v-8h-2v8Zm4 0h2V7h-2v11Zm4 0h2V4h-2v14Z" />
                              </svg>
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-900">
                                <path fill="currentColor" d="M12 18c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Zm-5.1-3.9 1.4 1.4c2.1-2.1 5.5-2.1 7.6 0l1.4-1.4c-2.9-2.9-7.5-2.9-10.4 0Zm-2.8-2.8 1.4 1.4c3.7-3.7 9.7-3.7 13.4 0l1.4-1.4c-4.5-4.5-11.7-4.5-16.2 0Z" />
                              </svg>
                              <div className="relative w-7 h-3.5 rounded-[4px] border border-gray-900/60">
                                <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-1 h-2 rounded-sm bg-gray-900/60" />
                                <div className="absolute left-[2px] top-[2px] bottom-[2px] rounded-[3px] bg-gray-900 transition-all duration-700" style={{ width: `${Math.round(Math.max(0.18, Math.min(0.94, batteryLevel)) * 100)}%` }} />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3">
                              <div className="text-[10px] tracking-widest text-gray-400 font-bold">ITEMS SOLD</div>
                              <div className="mt-2 flex items-end justify-between">
                                <div className="text-2xl font-extrabold text-blue-600 tabular-nums">{activeDemo.itemsSold}</div>
                                <div className="text-[10px] font-semibold text-green-700">▲ {activeDemo.itemsDelta}</div>
                              </div>
                            </div>
                            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3">
                              <div className="text-[10px] tracking-widest text-gray-400 font-bold">MARGIN</div>
                              <div className="mt-2 flex items-end justify-between">
                                <div className="text-2xl font-extrabold text-orange-500 tabular-nums">{activeDemo.margin.toFixed(1)}%</div>
                                <div className="text-[10px] font-semibold text-green-700">▲ {activeDemo.marginDelta}</div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-gray-900">Sales Trend — This Week</div>
                              <div className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">{activeDemo.trendLabel}</div>
                            </div>
                            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                              <div className="flex gap-3 items-start">
                                <div className="w-9 pt-1 flex flex-col justify-between h-16 text-[9px] text-gray-400 font-semibold">
                                  <div>$1.6k</div>
                                  <div>$1.2k</div>
                                  <div>$0.8k</div>
                                </div>
                                <div className="flex-1">
                                  <svg viewBox="0 0 240 80" className="w-full h-16">
                                    {[14, 32, 50, 68].map((y) => (
                                      <line key={y} x1="10" y1={y} x2="230" y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                                    ))}
                                    {[10, 46, 82, 118, 154, 190, 230].map((x) => (
                                      <line key={x} x1={x} y1="10" x2={x} y2="70" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
                                    ))}
                                    <path d={trendAreaPath} fill="rgba(22,163,74,0.15)" />
                                    <path d={trendPath} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
                                    {trendCoords.map((p, idx) => (
                                      <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#16a34a" style={{ transition: 'all 700ms ease' }} />
                                    ))}
                                  </svg>
                                  <div className="mt-1 grid grid-cols-7 text-[9px] text-gray-400 font-semibold">
                                    <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-gray-900">Revenue vs Expenses</div>
                              <div className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">6 Months</div>
                            </div>
                            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                              <div className="flex items-end gap-2 h-16">
                                {activeDemo.bars.map((b, idx) => (
                                  <div key={idx} className="flex-1 flex items-end gap-1">
                                    <div className="w-full rounded-md bg-green-500/85 transition-all duration-700" style={{ height: `${b.rev}px` }} />
                                    <div className="w-full rounded-md bg-red-400/70 transition-all duration-700" style={{ height: `${b.exp}px` }} />
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 grid grid-cols-6 text-[9px] text-gray-400 font-semibold">
                                <div>Jan</div><div>Feb</div><div>Mar</div><div>Apr</div><div>May</div><div>Jun</div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-gray-900">Profit Trend — 12 Months</div>
                              <div className="text-[10px] font-semibold px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">{activeDemo.profitYear}</div>
                            </div>
                            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                              <svg viewBox="0 0 240 80" className="w-full h-16">
                                {[14, 32, 50, 68].map((y) => (
                                  <line key={y} x1="10" y1={y} x2="230" y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                                ))}
                                <path d={profitAreaPath} fill="rgba(249,115,22,0.14)" />
                                <path d={profitPath} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                                {profitCoords.map((p, idx) => (
                                  <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#f97316" style={{ transition: 'all 700ms ease' }} />
                                ))}
                              </svg>
                              <div className="mt-1 grid grid-cols-12 text-[9px] text-gray-400 font-semibold">
                                <div>J</div><div>F</div><div>M</div><div>A</div><div>M</div><div>J</div><div>J</div><div>A</div><div>S</div><div>O</div><div>N</div><div>D</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-16 bg-white border-t border-gray-100">
                          <div className="h-full grid grid-cols-5 items-center px-3 text-[10px] font-semibold">
                            <div className="flex justify-center">
                              <div className="flex flex-col items-center gap-1 rounded-2xl bg-green-50 border border-green-100 px-3 py-2 text-green-700">
                                <svg viewBox="0 0 24 24" className="w-5 h-5">
                                  <path fill="currentColor" d="M12 3 3 10v11h6v-6h6v6h6V10l-9-7Z" />
                                </svg>
                                <div>Home</div>
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-1 text-gray-400">
                              <svg viewBox="0 0 24 24" className="w-5 h-5">
                                <path fill="currentColor" d="M4 19h16v2H4v-2Zm1-3h3V8H5v8Zm5 0h3V4h-3v12Zm5 0h3v-6h-3v6Z" />
                              </svg>
                              <div>Reports</div>
                            </div>
                            <div className="flex flex-col items-center gap-1 text-gray-400">
                              <svg viewBox="0 0 24 24" className="w-5 h-5">
                                <path fill="currentColor" d="M7 18c-.6 0-1.1-.2-1.5-.6L3 14.9l1.4-1.4L7 16.1 19.6 3.5 21 4.9 8.5 17.4c-.4.4-.9.6-1.5.6Z" />
                                <path fill="currentColor" d="M4 20h16v2H4v-2Z" opacity=".25" />
                              </svg>
                              <div>Sales</div>
                            </div>
                            <div className="flex flex-col items-center gap-1 text-gray-400">
                              <svg viewBox="0 0 24 24" className="w-5 h-5">
                                <path fill="currentColor" d="M7 7h13v13H7V7Zm-3 3H2V4h6v2H4v4Z" opacity=".25" />
                                <path fill="currentColor" d="M6 6h13v15H6V6Zm2 2v11h9V8H8Z" />
                              </svg>
                              <div>Stock</div>
                            </div>
                            <div className="flex flex-col items-center gap-1 text-gray-400">
                              <svg viewBox="0 0 24 24" className="w-5 h-5">
                                <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6Z" />
                              </svg>
                              <div>Profile</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-lg text-white/85 font-semibold">
                  Get reports for your business — connecting with us
                </div>
                <div className="mt-5 text-base text-white/85 leading-relaxed">
                  Set up your point of sale system in minutes.
                  <br />
                  Manage sales, inventory, and reports all in one place.
                </div>
              </div>

              <div className="mt-10 w-full flex justify-center">
                <div className="w-full max-w-sm">
                  <div className="text-xs tracking-[0.25em] text-white/75 font-semibold text-center">SETUP PROGRESS</div>
                  <div className="mt-4 relative">
                    <div className="absolute left-0 right-0 top-5 h-px bg-white/25" />
                    <div className="grid grid-cols-4 gap-4 relative">
                      {[
                        { n: 1, title: 'Phone', sub: 'Verify' },
                        { n: 2, title: 'OTP', sub: 'Code' },
                        { n: 3, title: 'Profile', sub: 'Details' },
                        { n: 4, title: 'Business', sub: 'Setup' }
                      ].map((it) => {
                        const completed = signupStep > it.n;
                        const current = signupStep === it.n;
                        const muted = !current && !completed;
                        const justCompleted = progressPulse && signupStep === it.n + 1;
                        return (
                          <div key={it.n} className={`flex flex-col items-center text-center ${muted ? 'opacity-60' : ''}`}>
                            <div
                              className={`relative w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ease-out ${
                                completed
                                  ? 'border-2 border-green-500 bg-green-600 text-white'
                                  : current
                                  ? 'border-2 border-white text-white bg-white/10'
                                  : 'border-2 border-white/40 text-white/80 bg-white/10'
                              } ${current && progressPulse ? 'scale-110' : 'scale-100'}`}
                            >
                              {justCompleted ? <span className="absolute inset-0 rounded-full bg-green-500/35 animate-ping" /> : null}
                              <span className={`transition-all duration-300 ${completed ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}>{String(it.n)}</span>
                              <span className={`absolute transition-all duration-300 ${completed ? 'opacity-100 scale-110' : 'opacity-0 scale-75'} ${justCompleted ? 'text-white' : ''}`}>✓</span>
                            </div>
                            <div className={`mt-3 text-sm ${current ? 'text-white font-semibold' : completed ? 'text-white/90 font-semibold' : 'text-white/85 font-semibold'}`}>{it.title}</div>
                            <div className={`text-xs ${current ? 'text-white/70' : completed ? 'text-white/60' : 'text-white/55'}`}>{it.sub}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className={`flex w-[200%] h-full ${
            transitionsEnabled ? 'transition-[transform] duration-[950ms] ease-[cubic-bezier(0.16,1,0.3,1)]' : ''
          } ${mode === 'signup' ? '-translate-x-1/2' : 'translate-x-0'}`}
        >
          <div
            className={`w-1/2 flex items-center justify-center py-8 px-6 lg:px-10 ${
              transitionsEnabled ? 'transition-opacity duration-500 ease-out' : ''
            } ${mode === 'login' ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className="w-full max-w-xl">
              <Login
                layout="embedded"
                onLogin={onLogin}
                onNavigateSignUp={() => navigate('/signup')}
              />
            </div>
          </div>

          <div
            className={`w-1/2 flex items-center justify-center py-8 px-6 lg:px-10 ${
              transitionsEnabled ? 'transition-opacity duration-500 ease-out' : ''
            } ${mode === 'signup' ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className="w-full max-w-2xl">
              <SignUp
                layout="embedded"
                onSignUp={onSignUp}
                onNavigateLogin={() => navigate('/login')}
                onStepChange={(s) => setSignupStep(Number(s) || 1)}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AuthLanding;
