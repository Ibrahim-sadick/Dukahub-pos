/* eslint-disable no-unused-vars */
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, Mail, Share2, List, Trash2 } from 'lucide-react';
import DateInput from '../shared/DateInput';
import { staffRecordsApi } from '../services/backendApi';

const TANZANIA_REGIONS = [
  'Arusha',
  'Dar es Salaam',
  'Dodoma',
  'Geita',
  'Iringa',
  'Kagera',
  'Katavi',
  'Kigoma',
  'Kilimanjaro',
  'Lindi',
  'Manyara',
  'Mara',
  'Mbeya',
  'Morogoro',
  'Mtwara',
  'Mwanza',
  'Njombe',
  'Pemba North',
  'Pemba South',
  'Pwani',
  'Rukwa',
  'Ruvuma',
  'Shinyanga',
  'Simiyu',
  'Singida',
  'Songwe',
  'Tabora',
  'Tanga',
  'Zanzibar Central/South',
  'Zanzibar North',
  'Zanzibar Urban/West'
];

const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const formatMoney0 = (value) => {
  const n = toNumber(value);
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  } catch {
    return n.toLocaleString();
  }
};

const Users = () => {
  const getCurrentUser = () => {
    try {
      const local = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (local) return local;
    } catch {}
    try {
      const session = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      if (session) return session;
    } catch {}
    return null;
  };
  const [currentUser] = useState(getCurrentUser);
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const canEdit = isAdmin;
  const [staff, setStaff] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    nationalId: '',
    salaryPerMonth: '',
    passportPhoto: '',
    message: '',
    placeFrom: '',
    allowance: '',
    date: new Date().toISOString().split('T')[0]
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);
  
  const createEmployeeIdGenerator = () => {
    const businessId = String(currentUser?.id || 'default');
    const key = `nextEmpNumber:${businessId}`;
    const startNumber = 273;
    const used = new Set();
    let maxUsedNumber = 0;

    try {
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
      (Array.isArray(allUsers) ? allUsers : [])
        .filter((u) => String(u?.role || '').toLowerCase() === 'staff' && String(u?.businessId || '') === String(currentUser?.id || ''))
        .forEach((u) => {
          const v = String(u?.staffEmployeeId || '').trim();
          if (v) used.add(v);
          const m = /^EMP-(\d{4,5})$/.exec(v);
          if (m) {
            const n = parseInt(m[1], 10);
            if (Number.isFinite(n) && n > maxUsedNumber) maxUsedNumber = n;
          }
        });
    } catch {}

    (Array.isArray(staff) ? staff : []).forEach((s) => {
      const v = String(s?.employeeId || '').trim();
      if (v) used.add(v);
      const m = /^EMP-(\d{4,5})$/.exec(v);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxUsedNumber) maxUsedNumber = n;
      }
    });

    const getNextNumber = () => {
      let n = startNumber;
      try {
        const raw = parseInt(localStorage.getItem(key) || String(startNumber), 10);
        n = Number.isFinite(raw) ? raw : startNumber;
      } catch {}
      const min = Math.max(startNumber, (maxUsedNumber || 0) + 1);
      if (n < min) n = min;
      return n;
    };

    const setNextNumber = (n) => {
      try {
        localStorage.setItem(key, String(n));
      } catch {}
    };

    return () => {
      let n = getNextNumber();
      for (let i = 0; i < 20000; i += 1) {
        const id = `EMP-${String(n).padStart(5, '0')}`;
        if (!used.has(id)) {
          used.add(id);
          setNextNumber(n + 1);
          return id;
        }
        n += 1;
      }
      return `EMP-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    };
  };


  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await staffRecordsApi.list();
        if (!mounted) return;
        const next = Array.isArray(list) ? list : [];
        setStaff(next);
        try {
          localStorage.setItem('staff', JSON.stringify(next));
        } catch {}
      } catch {
        try {
          const saved = JSON.parse(localStorage.getItem('staff') || '[]');
          if (!mounted) return;
          setStaff(Array.isArray(saved) ? saved : []);
        } catch {
          if (!mounted) return;
          setStaff([]);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('edit');
    if (id) {
      const list = Array.isArray(staff) ? staff : [];
      const existing = list.find((s) => String(s?.employeeId || '') === String(id));
      if (existing) {
        setEditingEmployeeId(existing.employeeId);
        setEditingRecordId(existing.id ?? null);
        setFormData({
          fullName: existing.fullName || '',
          age: String(existing.age ?? ''),
          nationalId: existing.nationalId || '',
          salaryPerMonth: String(existing.salaryPerMonth ?? ''),
          passportPhoto: '',
          message: existing.message || '',
          placeFrom: existing.placeFrom || '',
          allowance: String(existing.allowance ?? ''),
          date: existing.date || new Date().toISOString().split('T')[0]
        });
      }
    } else {
      setEditingEmployeeId(null);
      setEditingRecordId(null);
    }
  }, [location.search, staff]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const totalSalary = useMemo(() => {
    return toNumber(formData.salaryPerMonth) + toNumber(formData.allowance);
  }, [formData.allowance, formData.salaryPerMonth]);

  const recentRegistrations = useMemo(() => {
    const list = Array.isArray(staff) ? staff : [];
    return list.slice(-5).reverse();
  }, [staff]);

  const shareSummary = useMemo(() => {
    const total = `TZS ${formatMoney0(totalSalary)}`;
    const empId = editingEmployeeId ? `Employee ID: ${editingEmployeeId}` : 'Employee ID: AUTO';
    return `Staff Registration\nName: ${formData.fullName || '—'}\n${empId}\nDate: ${formData.date || '—'}\nTotal: ${total}`;
  }, [editingEmployeeId, formData.date, formData.fullName, totalSalary]);

  const validate = () => {
    const nextErrors = {};
    if (!formData.fullName.trim()) nextErrors.fullName = 'Full name is required';
    if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) <= 0) nextErrors.age = 'Valid age is required';
    if (!formData.nationalId.trim()) nextErrors.nationalId = 'National ID is required';
    if (
      !formData.salaryPerMonth ||
      isNaN(Number(formData.salaryPerMonth)) ||
      Number(formData.salaryPerMonth) <= 0
    ) nextErrors.salaryPerMonth = 'Valid salary is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      age: '',
      nationalId: '',
      salaryPerMonth: '',
      passportPhoto: '',
      message: '',
      placeFrom: '',
      allowance: '',
      date: new Date().toISOString().split('T')[0]
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    const payload = {
      fullName: String(formData.fullName || '').trim(),
      age: Number(formData.age),
      nationalId: String(formData.nationalId || '').trim(),
      salaryPerMonth: Number(formData.salaryPerMonth),
      allowance: Number(formData.allowance) || 0,
      placeFrom: String(formData.placeFrom || '').trim() || undefined,
      date: String(formData.date || '').trim(),
      message: String(formData.message || '').trim() || undefined
    };

    try {
      if (editingEmployeeId) {
        const recordId =
          editingRecordId ??
          (Array.isArray(staff) ? staff.find((s) => String(s?.employeeId || '') === String(editingEmployeeId))?.id : null);
        if (!recordId) return;
        await staffRecordsApi.patch(recordId, payload);
        setSuccessMessage('Staff updated successfully');
      } else {
        await staffRecordsApi.create(payload);
        setSuccessMessage('Staff saved successfully');
        resetForm();
      }

      const list = await staffRecordsApi.list();
      const next = Array.isArray(list) ? list : [];
      setStaff(next);
      try {
        localStorage.setItem('staff', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setSuccessMessage('Failed to save staff. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="text-gray-900 font-semibold">Staff Registered</div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2" type="button" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span className="text-sm">Print</span>
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
            type="button"
            onClick={() => {
              const subject = encodeURIComponent(`Staff Registration ${editingEmployeeId || ''}`.trim());
              const body = encodeURIComponent(`${shareSummary}\n\nNational ID: ${formData.nationalId || '—'}\nPlace From: ${formData.placeFrom || '—'}\nAge: ${formData.age || '—'}\nSalary/Month: ${formData.salaryPerMonth || '—'}\nAllowance: ${formData.allowance || '—'}\n\n${formData.message ? `Notes: ${formData.message}\n` : ''}`);
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}
          >
            <Mail className="w-4 h-4" />
            <span className="text-sm">Email</span>
          </button>
          <div className="relative">
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
              type="button"
              onClick={() => setShowShareMenu((v) => !v)}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm">Share</span>
            </button>
            {showShareMenu && (
              <div className="absolute right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow w-56">
                <button
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                  type="button"
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
                    setShowShareMenu(false);
                  }}
                >
                  Copy Link
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shareSummary);
                    setShowShareMenu(false);
                  }}
                >
                  Copy Summary
                </button>
              </div>
            )}
          </div>
          <button
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
            type="button"
            onClick={() => navigate('/users/list')}
          >
            <List className="w-4 h-4" />
            <span className="text-sm">Show List</span>
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2"
            type="button"
            onClick={resetForm}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Clear</span>
          </button>
        </div>
      </div>

      {showShareMenu && <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />}

      {!canEdit ? (
        <div className="px-6 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 rounded-lg text-sm font-medium">
            You are logged in as staff. Only Admin can save or edit staff registrations.
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div className="px-6 pt-4">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">{successMessage}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
                <div className="max-w-xl">
                  <input
                    className={`w-full px-3 py-2 border rounded-lg text-gray-700 bg-white ${errors.fullName ? 'border-red-500' : 'border-gray-300'}`}
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter full name"
                  />
                </div>
              </div>
              <div className="md:col-span-1">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <DateInput className="w-full max-w-[220px] px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700" name="date" value={formData.date} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Employee ID</label>
                    <input className="w-full max-w-[220px] px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700" value={editingEmployeeId || 'AUTO-GENERATED'} readOnly />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">DETAILS</div>
            </div>
            <div className="p-4 overflow-auto">
              <table className="min-w-[1100px] w-full table-fixed border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">No.</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">National ID</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">Place From</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Age</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-2/12 border border-gray-200">Salary/Month</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-2/12 border border-gray-200">Allowance</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-2/12 border border-gray-200">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-middle">
                    <td className="px-3 py-2 border border-gray-200 text-center text-sm text-gray-600 select-none">1</td>
                    <td className="px-3 py-2 border border-gray-200">
                      <input
                        className={`w-full px-2 py-1 text-sm bg-transparent focus:outline-none ${errors.nationalId ? 'border border-red-500 rounded' : ''}`}
                        name="nationalId"
                        value={formData.nationalId}
                        onChange={handleChange}
                        placeholder="National ID"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <input
                        className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"
                        name="placeFrom"
                        list="tanzania-regions"
                        value={formData.placeFrom}
                        onChange={handleChange}
                        placeholder="Place from"
                      />
                      <datalist id="tanzania-regions">
                        {TANZANIA_REGIONS.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <input
                        type="number"
                        className={`w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none ${errors.age ? 'border border-red-500 rounded' : ''}`}
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <input
                        type="number"
                        className={`w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none ${errors.salaryPerMonth ? 'border border-red-500 rounded' : ''}`}
                        name="salaryPerMonth"
                        value={formData.salaryPerMonth}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none"
                        name="allowance"
                        value={formData.allowance}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-right font-semibold text-gray-900">
                      TZS {formatMoney0(totalSalary)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="w-full px-3 py-2 border rounded-lg h-20 text-sm" name="message" value={formData.message} onChange={handleChange} placeholder="Comments" />
            </div>
            <div className="w-full max-w-md ml-auto">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Subtotal</span>
                <span className="font-medium">TZS {formatMoney0(totalSalary)}</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-xs text-gray-500 tracking-wide">TOTAL</div>
                <div className="text-2xl font-semibold text-gray-900">TZS {formatMoney0(totalSalary)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100">Clear</button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                const fakeEvent = { preventDefault: () => {} };
                handleSubmit(fakeEvent);
              }}
              className={`px-4 py-2 rounded-lg ${canEdit ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-600/60 text-white cursor-not-allowed'}`}
            >
              Save & New
            </button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                const fakeEvent = { preventDefault: () => {} };
                handleSubmit(fakeEvent);
                navigate('/users/list');
              }}
              className={`px-4 py-2 rounded-lg ${canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600/60 text-white cursor-not-allowed'}`}
            >
              Save & Close
            </button>
          </div>
        </div>
        <div className="border-l border-gray-200 bg-gray-50 p-5">
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Employee</div>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between"><span>Name</span><span className="font-medium text-gray-900">{formData.fullName || '—'}</span></div>
              <div className="flex justify-between"><span>Employee ID</span><span className="font-medium text-gray-900">{editingEmployeeId || 'AUTO'}</span></div>
              <div className="flex justify-between"><span>Date</span><span className="font-medium text-gray-900">{formData.date || '—'}</span></div>
              <div className="flex justify-between"><span>Total</span><span className="font-medium text-gray-900">TZS {formatMoney0(totalSalary)}</span></div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Recent Registrations</div>
            <div className="space-y-1 text-sm text-gray-700 italic">
              {recentRegistrations.length ? (
                recentRegistrations.map((r) => (
                  <div key={String(r.employeeId || r.createdAt || Math.random())} className="flex justify-between gap-3">
                    <span className="truncate">{String(r.fullName || '').trim() || '—'}</span>
                    <span className="font-medium whitespace-nowrap">TZS {formatMoney0(toNumber(r.salaryPerMonth) + toNumber(r.allowance))}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No registrations</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;
