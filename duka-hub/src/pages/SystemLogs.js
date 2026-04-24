import React, { useEffect, useMemo, useRef, useState } from 'react';
import { activityApi } from '../services/activityApi';

const toDisplayTs = (iso) => {
  try {
    const d = new Date(String(iso || ''));
    if (Number.isNaN(d.getTime())) return String(iso || '');
    return d.toLocaleString();
  } catch {
    return String(iso || '');
  }
};

const getLogTime = (entry) => {
  const value = Date.parse(String(entry?.createdAt || entry?.ts || ''));
  return Number.isFinite(value) ? value : 0;
};

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const inFlightRef = useRef(false);
  const loadedOnceRef = useRef(false);
  const canViewLogs = true;

  useEffect(() => {
    if (!canViewLogs) return;
    let alive = true;
    const loop = async () => {
      while (alive) {
        if (!inFlightRef.current) {
          inFlightRef.current = true;
          try {
            if (!loadedOnceRef.current) setLoading(true);
            const res = await activityApi.list({ limit: 500 });
            if (!alive) break;
            setLogs(
              (Array.isArray(res) ? res : []).slice().sort((a, b) => getLogTime(b) - getLogTime(a))
            );
            setError('');
            loadedOnceRef.current = true;
          } catch (e) {
            if (!alive) break;
            setLogs([]);
            const msg = String(e?.message || 'Failed to load system logs');
            if (!/aborted|abort/i.test(msg)) setError(msg);
            loadedOnceRef.current = true;
          } finally {
            inFlightRef.current = false;
            if (alive) setLoading(false);
          }
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    };
    loop();
    return () => {
      alive = false;
      try {
        void loadedOnceRef;
      } catch {}
    };
  }, [canViewLogs]);

  const rows = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    const list = Array.isArray(logs) ? logs : [];
    if (!q) return list;
    return list.filter((r) => {
      const actor = r?.actor?.fullName || r?.actor?.employeeId || r?.actor?.phone || r?.actorHint?.fullName || r?.actorHint?.employeeId || '';
      return (
        String(r?.title || '').toLowerCase().includes(q) ||
        String(r?.action || '').toLowerCase().includes(q) ||
        String(r?.entityType || r?.module || '').toLowerCase().includes(q) ||
        String(r?.entityId || '').toLowerCase().includes(q) ||
        String(r?.details || '').toLowerCase().includes(q) ||
        String(actor || '').toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-300 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">Activity</div>
            <div className="text-sm text-gray-600 mt-1">Backend-tracked activity for staff and admin across devices.</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-[240px]">
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{toDisplayTs(r.createdAt || r.ts)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r?.actor?.fullName || r?.actorHint?.fullName || r?.actor?.employeeId || r?.actorHint?.employeeId || r?.actor?.phone || ''}
                      {r?.actor?.employeeId || r?.actorHint?.employeeId ? <span className="text-xs text-gray-500"> ({r?.actor?.employeeId || r?.actorHint?.employeeId})</span> : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(r.action || '').toUpperCase()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r.entityType || r.module}
                      {r.entityId ? <span className="text-xs text-gray-500"> #{r.entityId}</span> : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{r.title}</div>
                      {r.details ? <div className="text-xs text-gray-500 mt-1">{r.details}</div> : null}
                    </td>
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
