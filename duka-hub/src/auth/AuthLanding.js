import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Login from './Login';
import SignUp from './SignUp';

const AuthLanding = ({ onLogin, onSignUp }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  const mode = useMemo(() => {
    if (location.pathname === '/signup') return 'signup';
    return 'login';
  }, [location.pathname]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setTransitionsEnabled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-gray-50 grid grid-cols-1 md:grid-cols-2">
      <div className="relative overflow-hidden min-h-[560px] md:min-h-0">
        <div className="absolute inset-0 bg-[#0b1220]" />
        <img src="/duka5pos.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 z-0 flex items-end justify-start px-10 pb-16 lg:pb-20">
          <div className="space-y-10">
            <div className="w-[26rem] text-left mt-4">
              <div className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
                Run your business smarter with <span className="text-green-400">Duka</span>Hub
              </div>
              <div className="mt-8 space-y-4 text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-base">Record sales fast, even during busy hours.</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-base">Keep purchases and expenses organized in one place.</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-base">Stay on top of stock to reduce losses and shortages.</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-base">See clear reports to understand profit and progress.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className={`flex w-[200%] h-full ${transitionsEnabled ? 'transition-transform duration-700 ease-in-out' : ''} ${
            mode === 'signup' ? '-translate-x-1/2' : 'translate-x-0'
          }`}
        >
          <div className="w-1/2 flex items-center justify-center py-8 px-6 lg:px-10">
            <div className="w-full max-w-lg origin-top scale-[0.92]">
              <Login
                layout="embedded"
                onLogin={onLogin}
                onNavigateSignUp={() => navigate('/signup')}
              />
            </div>
          </div>
          <div className="w-1/2 flex items-center justify-center py-8 px-6 lg:px-10">
            <div className="w-full max-w-2xl origin-top">
              <SignUp
                layout="embedded"
                onSignUp={onSignUp}
                onNavigateLogin={() => navigate('/login')}
                onStepChange={() => {}}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AuthLanding;
