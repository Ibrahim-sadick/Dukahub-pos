import React, { useEffect, useState } from 'react';
import { User, Printer, Share2, Mail, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { staffRecordsApi } from '../services/backendApi';

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const todayKey = new Date().toISOString().slice(0,10);
  const navigate = useNavigate();

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
    const handler = () => load();
    load();
    window.addEventListener('storage', handler);
    window.addEventListener('dataUpdated', handler);
    return () => {
      mounted = false;
      window.removeEventListener('storage', handler);
      window.removeEventListener('dataUpdated', handler);
    };
  }, [todayKey]);

  const derived = staff.map(s => ({ ...s, status: s.status || 'live' }));
  const filtered = derived.filter(s => {
    const statusOk = statusFilter === 'all' ? true : s.status === statusFilter;
    return statusOk;
  });
  const counts = {
    live: derived.filter(s => (s.status || 'live') === 'live').length,
    suspended: derived.filter(s => s.status === 'suspended').length,
    retired: derived.filter(s => s.status === 'retired').length
  };
  const setStatus = async (employeeId, status) => {
    const list = Array.isArray(staff) ? staff : [];
    const rec = list.find((s) => String(s?.employeeId || '') === String(employeeId));
    if (!rec?.id) return;
    try {
      await staffRecordsApi.patch(rec.id, { status: String(status || '').trim() });
      const refreshed = await staffRecordsApi.list();
      const next = Array.isArray(refreshed) ? refreshed : [];
      setStaff(next);
      try {
        localStorage.setItem('staff', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
    } catch {}
  };

  const printList = () => {
    window.print();
  };
  const shareList = async () => {
    const text = filtered.map(s => `${s.employeeId} - ${s.fullName} (${s.status || 'live'})`).join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: 'Staff List', text }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('Staff list copied to clipboard');
      } catch {
        alert('Sharing not supported');
      }
    }
  };
  const emailList = () => {
    const subject = 'Staff List';
    const body = filtered.map(s => `${s.employeeId} - ${s.fullName} - ${s.status || 'live'}`).join('\n');
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-gray-300">
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 flex items-center gap-1"
              onClick={()=>navigate('/users')}
            >
              <UserPlus className="w-4 h-4" />
              <span>New Employee</span>
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 flex items-center gap-1"
              onClick={printList}
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 flex items-center gap-1"
              onClick={shareList}
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 flex items-center gap-1"
              onClick={emailList}
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
            <span className="mx-2 h-6 w-px bg-gray-300"></span>
            <button
              className={`px-3 py-1.5 rounded-lg border text-sm ${statusFilter==='live' ? 'border-green-600 text-green-700 bg-green-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              onClick={()=>setStatusFilter('live')}
              title={`Live (${counts.live})`}
            >
              Live ({counts.live})
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg border text-sm ${statusFilter==='suspended' ? 'border-yellow-600 text-yellow-700 bg-yellow-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              onClick={()=>setStatusFilter('suspended')}
              title={`Suspended (${counts.suspended})`}
            >
              Suspended ({counts.suspended})
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg border text-sm ${statusFilter==='retired' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              onClick={()=>setStatusFilter('retired')}
              title={`Retired (${counts.retired})`}
            >
              Retired ({counts.retired})
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg border text-sm ${statusFilter==='all' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              onClick={()=>setStatusFilter('all')}
            >
              All
            </button>
          </div>
        </div>
        {derived.length > 0 ? (
          <div className="bg-white border border-gray-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Staff Records</h3>
                <p className="text-sm text-gray-600">All employees</p>
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">National ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary/Month</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(s => (
                  <tr key={s.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        className="text-blue-600 hover:text-blue-800 underline"
                        onClick={()=>navigate(`/users?edit=${encodeURIComponent(s.employeeId)}`)}
                        title="Edit employee"
                      >
                        {s.employeeId}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className={`px-2 py-1 rounded border text-xs ${ (s.status||'live')==='live' ? 'border-green-600 text-green-700 bg-green-50' : 'border-gray-300 text-gray-700' }`}
                          onClick={()=>setStatus(s.employeeId, 'live')}
                        >
                          Live
                        </button>
                        <button
                          className={`px-2 py-1 rounded border text-xs ${ s.status==='suspended' ? 'border-yellow-600 text-yellow-700 bg-yellow-50' : 'border-gray-300 text-gray-700' }`}
                          onClick={()=>setStatus(s.employeeId, 'suspended')}
                        >
                          Suspended
                        </button>
                        <button
                          className={`px-2 py-1 rounded border text-xs ${ s.status==='retired' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-gray-300 text-gray-700' }`}
                          onClick={()=>setStatus(s.employeeId, 'retired')}
                        >
                          Retired
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${ (s.status||'live')==='live' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200' }`}>
                        { (s.status||'live')==='live' ? 'Active' : 'Not Active' }
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.age}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.nationalId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Number(s.salaryPerMonth).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <User className="w-12 h-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No staff</h3>
            <p className="mt-1 text-sm text-gray-500">Register employees on the Staff page.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffList;
