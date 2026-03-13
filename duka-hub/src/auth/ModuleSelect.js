import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Drumstick, Store, UtensilsCrossed } from 'lucide-react';

const ModuleSelect = () => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [selectedModule, setSelectedModule] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingKey, setLoadingKey] = useState('');

  const moduleOptions = useMemo(
    () => [
      {
        id: 'retail_supermarket',
        title: 'Retail & Supermarkets',
        description: 'Fast POS, stock control, barcode scanning.',
        Icon: Store,
        accent: 'bg-sky-600',
        features: ['Quick POS', 'Barcode scanning', 'Stock tracking', 'Customer credit']
      },
      {
        id: 'bar_restaurant',
        title: 'Bar & Restaurants',
        description: 'Tables, orders, kitchen flow, bar tabs.',
        Icon: UtensilsCrossed,
        accent: 'bg-orange-600',
        features: ['Table management', 'KDS flow', 'Bar tabs', 'Recipe costing']
      },
      {
        id: 'chicken_meat',
        title: 'Chicken/Eggs',
        description: 'Batches, weight sales, profit tracking.',
        Icon: Drumstick,
        accent: 'bg-emerald-600',
        features: ['Batch tracking', 'Weight sales', 'Stock tracking', 'Profit reports']
      }
    ],
    []
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('signupDraft');
      if (!raw) {
        navigate('/signup', { replace: true });
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.otpVerified || !parsed?.formData) {
        navigate('/signup', { replace: true });
        return;
      }
      setDraft(parsed);
      setSelectedModule(String(parsed?.selectedModule || '').trim());
    } catch {
      navigate('/signup', { replace: true });
    }
  }, [navigate]);

  const delayToFiveSeconds = async (startedAt) => {
    const elapsed = Date.now() - startedAt;
    const remaining = 5000 - elapsed;
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
  };

  const handleContinue = async () => {
    if (isSubmitting) return;
    const startedAt = Date.now();
    const picked = String(selectedModule || '').trim();
    if (!picked) {
      setError('Please choose a business module');
      return;
    }
    if (!draft?.formData) {
      navigate('/signup', { replace: true });
      return;
    }
    setIsSubmitting(true);
    setLoadingKey('continue');
    await delayToFiveSeconds(startedAt);
    try {
      const nextDraft = { ...draft, selectedModule: picked };
      sessionStorage.setItem('signupDraft', JSON.stringify(nextDraft));
      setDraft(nextDraft);
    } catch {}
    navigate('/signup/plan');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100">
      <div className="min-h-screen w-full">
        <div className="min-h-screen w-full bg-white/40 backdrop-blur-2xl border border-white/50 shadow-sm">
          <div className="px-6 lg:px-12 py-10 lg:py-14">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-start mb-4">
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-white/60 hover:bg-white text-gray-900 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-gray-900">Choose the suites</div>
                <div className="mt-2 text-base md:text-lg text-gray-700">Complete your business solutions</div>
              </div>

              {error ? <div className="mt-6 text-red-600 text-base text-center">{error}</div> : null}

              <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {moduleOptions.map((opt) => {
                  const selected = selectedModule === opt.id;
                  const Icon = opt.Icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (isSubmitting) return;
                        setSelectedModule(opt.id);
                        setError('');
                        setIsSubmitting(true);
                        setLoadingKey(`module:${opt.id}`);
                        try {
                          const nextDraft = { ...draft, selectedModule: opt.id };
                          sessionStorage.setItem('signupDraft', JSON.stringify(nextDraft));
                          setDraft(nextDraft);
                        } catch {}
                        setTimeout(() => {
                          setIsSubmitting(false);
                          setLoadingKey('');
                        }, 5000);
                      }}
                      disabled={isSubmitting && loadingKey !== `module:${opt.id}`}
                      className={
                        selected
                          ? 'text-left bg-white/85 backdrop-blur-xl border-2 border-green-500 rounded-3xl p-10 shadow-2xl transition-all duration-300 hover:bg-white/95 hover:-translate-y-1 hover:scale-[1.02]'
                          : 'text-left bg-white/55 backdrop-blur-xl border border-white/60 rounded-3xl p-10 shadow-lg transition-all duration-300 hover:bg-white/85 hover:border-green-200 hover:-translate-y-1 hover:shadow-xl hover:scale-[1.01]'
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`w-20 h-20 rounded-3xl ${opt.accent} text-white flex items-center justify-center transition-transform duration-300 ${selected ? 'scale-105' : ''}`}>
                          <Icon className="w-10 h-10" />
                        </div>
                        <div
                          className={
                            selected
                              ? 'w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center transition-transform duration-300 scale-105'
                              : 'w-8 h-8 rounded-full bg-white/70 border border-white/60 text-gray-500 flex items-center justify-center transition-transform duration-300'
                          }
                        >
                          <BadgeCheck className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="mt-7 text-3xl font-semibold text-gray-900">{opt.title}</div>
                      <div className="mt-3 text-lg text-gray-700">{opt.description}</div>

                      <div className="mt-7 text-lg font-semibold text-green-700">{opt.features.length}+ Features</div>
                      <div className="mt-5 space-y-4">
                        {opt.features.map((f) => (
                          <div key={f} className="flex items-center gap-3 text-lg text-gray-800">
                            <span className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-base">✓</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8">
                        <div
                          className={
                            selected
                              ? 'w-full text-center px-4 py-4 rounded-2xl bg-green-600 text-white text-lg font-semibold transition-all duration-300'
                              : 'w-full text-center px-4 py-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-lg font-semibold transition-all duration-300'
                          }
                        >
                          {selected ? 'Selected' : 'Select'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-10 flex items-center justify-center">
                <button
                  type="button"
                  className="px-10 py-4 rounded-2xl bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-lg font-semibold transition-transform duration-300 hover:scale-[1.01]"
                  onClick={handleContinue}
                  disabled={isSubmitting}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {loadingKey === 'continue' ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                    <span>Continue</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleSelect;
