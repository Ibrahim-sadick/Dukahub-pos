import React, { useEffect, useMemo, useState } from 'react';
import { activityApi } from '../services/backendApi';

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

const toDisplayTs = (iso) => {
  try {
    const d = new Date(String(iso || ''));
    if (Number.isNaN(d.getTime())) return String(iso || '');
    return d.toLocaleString();
  } catch {
    return String(iso || '');
  }
};

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const currentUser = getCurrentUser();
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await activityApi.list({ take: 200 });
        if (!mounted) return;
        setLogs(Array.isArray(res) ? res : []);
      } catch (e) {
        if (!mounted) return;
        setError(String(e?.message || 'Failed to load system logs'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isAdmin]);

  const rows = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    const list = Array.isArray(logs) ? logs : [];
    if (!q) return list;
    return list.filter((r) => {
      const actor = r?.actor?.fullName || r?.actor?.employeeId || r?.actor?.phone || '';
      return (
        String(r?.title || '').toLowerCase().includes(q) ||
        String(r?.action || '').toLowerCase().includes(q) ||
        String(r?.entityType || '').toLowerCase().includes(q) ||
        String(r?.entityId || '').toLowerCase().includes(q) ||
        String(actor || '').toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-300 p-6">
        <div className="text-lg font-semibold text-gray-900">Access denied</div>
        <div className="text-sm text-gray-600 mt-1">Only Admin can view system logs.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-300 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">System Logs</div>
            <div className="text-sm text-gray-600 mt-1">Activity done by staff will appear here (sales, expenses, purchases).</div>
          </div>
          <div className="min-w-[240px]">
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error ? <div className="mt-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div> : null}
      </div>

      <div className="bg-white border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{toDisplayTs(r.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r?.actor?.fullName || '—'}
                      {r?.actor?.employeeId ? <span className="text-xs text-gray-500"> ({r.actor.employeeId})</span> : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(r.action || '').toUpperCase()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r.entityType}
                      {r.entityId ? <span className="text-xs text-gray-500"> #{r.entityId}</span> : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.title}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600" colSpan={5}>
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;

