import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Search, Pencil, Users, Trash2, Eye, KeyRound } from 'lucide-react';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';

const readJson = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const getCurrentUser = () => {
  try {
    const local = readJson(localStorage.getItem('currentUser') || 'null', null);
    if (local) return local;
  } catch {}
  try {
    const session = readJson(sessionStorage.getItem('currentUser') || 'null', null);
    if (session) return session;
  } catch {}
  return null;
};

const sanitizePassword = (value) => String(value || '');

const createEmployeeIdGenerator = ({ businessId, users, staff }) => {
  const bid = String(businessId || 'default');
  const key = `nextEmpNumber:${bid}`;
  const startNumber = 273;
  const used = new Set();
  let maxUsedNumber = 0;
  (Array.isArray(users) ? users : []).forEach((u) => {
    if (String(u?.role || '').toLowerCase() !== 'staff') return;
    if (String(u?.businessId || '') !== String(businessId || '')) return;
    const v = String(u?.staffEmployeeId || '').trim();
    if (v) used.add(v);
    const m = /^EMP-(\d{4,5})$/.exec(v);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxUsedNumber) maxUsedNumber = n;
    }
  });
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

const createDefaultRoles = () => {
  const now = Date.now();
  return [
    {
      id: `role_staff_${now}`,
      name: 'Staff',
      description: 'Standard staff access (no Settings, Staff, or Reports)',
      isDefault: true,
      permissions: [
        'sales.create',
        'sales.edit',
        'sales.discount',
        'refunds.create',
        'products.view',
        'inventory.view',
        'customers.view',
        'customers.edit'
      ],
      updatedAt: new Date().toISOString()
    }
  ];
};

const Toggle = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={
        disabled
          ? 'relative w-12 h-7 rounded-full bg-gray-200 border border-gray-200 opacity-60 cursor-not-allowed transition duration-200'
          : checked
            ? 'relative w-12 h-7 rounded-full bg-green-600 border border-green-600 transition duration-200'
            : 'relative w-12 h-7 rounded-full bg-gray-200 border border-gray-200 transition duration-200'
      }
    >
      <span className={checked ? 'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-5' : 'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-0'} />
    </button>
  );
};

const ModalShell = ({ open, title, subtitle, onClose, children, widthClass }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-[94vw] ${widthClass || 'max-w-[980px]'} bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden`}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-gray-600">{subtitle}</div> : null}
          </div>
          <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default function RolesPermissions() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const businessId = useMemo(() => String(currentUser?.id || ''), [currentUser?.id]);
  const rolesKey = useMemo(() => `roles:${businessId || 'default'}`, [businessId]);
  const companyInfo = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('companyInfo') || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }, []);

  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);

  const [toast, setToast] = useState('');

  const pushAudit = (entry) => {
    void entry;
  };

  useEffect(() => {
    try {
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
      setUsers(Array.isArray(allUsers) ? allUsers : []);
    } catch {
      setUsers([]);
    }
    try {
      const allStaff = JSON.parse(localStorage.getItem('staff') || '[]');
      setStaff(Array.isArray(allStaff) ? allStaff : []);
    } catch {
      setStaff([]);
    }
    try {
      const defaults = createDefaultRoles();
      localStorage.setItem(rolesKey, JSON.stringify(defaults));
      setRoles(defaults);
    } catch {
      const defaults = createDefaultRoles();
      try {
        localStorage.setItem(rolesKey, JSON.stringify(defaults));
      } catch {}
      setRoles(defaults);
    }
  }, [rolesKey]);

  const staffUsers = useMemo(() => {
    const staffList = Array.isArray(staff) ? staff : [];
    const userList = Array.isArray(users) ? users : [];
    const accounts = userList.filter((u) => String(u?.role || '').toLowerCase() === 'staff' && String(u?.businessId || '') === String(businessId || ''));
    const defaultRole = roles.find((r) => r?.isDefault) || roles[0] || null;
    const byEmployeeId = new Map();
    staffList.forEach((s) => {
      const employeeId = String(s?.employeeId || '').trim();
      if (!employeeId) return;
      byEmployeeId.set(employeeId, {
        id: `STAFF-${employeeId}`,
        role: 'staff',
        businessId,
        fullName: String(s?.fullName || '').trim(),
        email: String(s?.email || ''),
        phone: '',
        staffEmployeeId: employeeId,
        roleId: String(defaultRole?.id || ''),
        accessEnabled: false,
        lastLoginAt: '',
        _hasAccount: false,
        createdAt: String(s?.createdAt || '')
      });
    });
    accounts.forEach((u) => {
      const employeeId = String(u?.staffEmployeeId || '').trim();
      if (!employeeId) return;
      byEmployeeId.set(employeeId, { ...u, _hasAccount: true });
    });
    return Array.from(byEmployeeId.values()).sort((a, b) => String(a?.fullName || '').localeCompare(String(b?.fullName || '')));
  }, [businessId, roles, staff, users]);

  const roleById = useMemo(() => {
    const map = new Map();
    (roles || []).forEach((r) => map.set(String(r.id), r));
    return map;
  }, [roles]);

  const staffRole = useMemo(() => {
    return (roles || []).find((r) => String(r?.name || '').toLowerCase() === 'staff') || (roles || [])[0] || null;
  }, [roles]);

  const staffRoleId = String(staffRole?.id || '');

  const generateEmployeeId = useMemo(() => createEmployeeIdGenerator({ businessId, users, staff }), [businessId, staff, users]);

  const [userSearch, setUserSearch] = useState('');
  const [usersStatusFilter, setUsersStatusFilter] = useState('all');
  const [usersAccessFilter, setUsersAccessFilter] = useState('all');
  const [usersSort, setUsersSort] = useState('name_asc');
  const [usersPage, setUsersPage] = useState(1);
  const [deleteUserModal, setDeleteUserModal] = useState({ open: false, employeeId: '', fullName: '' });
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  const [userModal, setUserModal] = useState({ open: false, mode: 'create', userId: '' });
  const [userDraft, setUserDraft] = useState({
    fullName: '',
    email: '',
    contact: '',
    staffEmployeeId: '',
    roleId: '',
    accessEnabled: true,
    password: '',
    confirmPassword: ''
  });
  const planInfo = useMemo(() => {
    const planId = String(companyInfo?.subscriptionPlan || currentUser?.subscriptionPlan || '').trim().toLowerCase();
    const title =
      planId === 'starter'
        ? 'Starter'
        : planId === 'professional'
          ? 'Professional'
          : planId === 'enterprise'
            ? 'Enterprise'
            : planId
              ? planId
              : 'Starter';
    const rawLimit = Number(companyInfo?.subscriptionUserLimit ?? currentUser?.subscriptionUserLimit ?? 0);
    const mappedTotalLimit = planId === 'professional' ? 6 : planId === 'enterprise' ? 11 : 3;
    const totalLimit = rawLimit === 2 || rawLimit === 5 || rawLimit === 10 ? rawLimit + 1 : (rawLimit > 0 ? rawLimit : mappedTotalLimit);
    const staffLimit = Math.max(0, totalLimit - 1);
    return { planId: planId || 'starter', title, totalLimit, staffLimit };
  }, [companyInfo?.subscriptionPlan, companyInfo?.subscriptionUserLimit, currentUser?.subscriptionPlan, currentUser?.subscriptionUserLimit]);

  const seatsUsed = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    const staffCount = list.filter((u) => String(u?.role || '').toLowerCase() === 'staff' && String(u?.businessId || '') === String(businessId || '')).length;
    const adminCount = list.filter((u) => String(u?.role || '').toLowerCase() === 'admin' && String(u?.id || '') === String(businessId || '')).length;
    return staffCount + adminCount;
  }, [businessId, users]);

  const seatsFull = useMemo(() => {
    const limit = Number(planInfo.totalLimit || 0);
    if (!limit) return false;
    return seatsUsed >= limit;
  }, [planInfo.totalLimit, seatsUsed]);

  const seatsIndicator = useMemo(() => {
    const limit = Number(planInfo.totalLimit || 0);
    if (!limit) return '';
    return `${seatsUsed}/${limit}`;
  }, [planInfo.totalLimit, seatsUsed]);

  const openCreateLoginForStaff = (staffUserLike) => {
    if (seatsFull) {
      setToast('User limit reached. Upgrade your plan to add more users.');
      setTimeout(() => setToast(''), 2200);
      return;
    }
    setUserDraft({
      fullName: String(staffUserLike?.fullName || '').trim(),
      email: String(staffUserLike?.email || '').trim(),
      contact: String(staffUserLike?.phone || '').trim(),
      staffEmployeeId: String(staffUserLike?.staffEmployeeId || '').trim() || generateEmployeeId(),
      roleId: staffRoleId,
      accessEnabled: true,
      password: '',
      confirmPassword: ''
    });
    setUserModal({ open: true, mode: 'createFromStaff', userId: '' });
  };

  const openEditUser = (staffUser) => {
    setUserDraft({
      fullName: String(staffUser?.fullName || ''),
      email: String(staffUser?.email || ''),
      contact: String(staffUser?.phone || ''),
      staffEmployeeId: String(staffUser?.staffEmployeeId || ''),
      roleId: staffRoleId,
      accessEnabled: staffUser?.accessEnabled !== false,
      password: '',
      confirmPassword: ''
    });
    setUserModal({ open: true, mode: 'edit', userId: String(staffUser?.id || '') });
  };

  const saveUsers = (next) => {
    setUsers(next);
    try {
      localStorage.setItem('users', JSON.stringify(next));
    } catch {}
  };

  const saveStaff = (next) => {
    setStaff(next);
    try {
      localStorage.setItem('staff', JSON.stringify(next));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('dataUpdated'));
    } catch {}
  };

  const createOrUpdateStaffUser = () => {
    const employeeId = String(userDraft.staffEmployeeId || '').trim();
    const fullName = String(userDraft.fullName || '').trim();
    if (!employeeId || !fullName) {
      setToast('Full Name and EMP Number are required');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    const roleId = staffRoleId;
    const accessEnabled = Boolean(userDraft.accessEnabled);
    const emailRaw = String(userDraft.email || '').trim();
    const contactRaw = String(userDraft.contact || '').trim();
    const emailValue = !emailRaw && contactRaw.includes('@') ? contactRaw : emailRaw;
    const phoneValue = !emailRaw && contactRaw.includes('@') ? '' : contactRaw;
    const pass = sanitizePassword(userDraft.password || '');
    const confirm = sanitizePassword(userDraft.confirmPassword || '');

    if (userModal.mode === 'create' || userModal.mode === 'createFromStaff') {
      if (seatsFull) {
        setToast('User limit reached. Upgrade your plan to add more users.');
        setTimeout(() => setToast(''), 2200);
        return;
      }
      if (!pass) {
        setToast('Password is required');
        setTimeout(() => setToast(''), 2000);
        return;
      }
      if (pass !== confirm) {
        setToast('Password confirmation does not match');
        setTimeout(() => setToast(''), 2000);
        return;
      }

      const list = Array.isArray(users) ? users.slice() : [];
      const exists = list.some(
        (u) =>
          String(u?.role || '').toLowerCase() === 'staff' &&
          String(u?.businessId || '') === String(businessId || '') &&
          String(u?.staffEmployeeId || '') === employeeId
      );
      if (exists) {
        setToast('EMP Number already exists');
        setTimeout(() => setToast(''), 2000);
        return;
      }

      const nextUser = {
        id: `USR-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: 'staff',
        businessId,
        companyName: String(currentUser?.companyName || ''),
        fullName,
        email: emailValue,
        phone: phoneValue,
        password: pass,
        forcePasswordChange: false,
        staffEmployeeId: employeeId,
        roleId,
        accessEnabled,
        createdAt: new Date().toISOString()
      };
      const next = [nextUser, ...list];
      saveUsers(next);

      {
        const staffList = Array.isArray(staff) ? staff.slice() : [];
        const idx = staffList.findIndex((s) => String(s?.employeeId || '').trim() === employeeId);
        if (idx >= 0) {
          staffList[idx] = {
            ...staffList[idx],
            employeeId,
            fullName,
            email: emailValue || String(staffList[idx]?.email || '')
          };
          saveStaff(staffList);
        } else {
          staffList.push({
            employeeId,
            fullName,
            email: emailValue,
            age: 0,
            nationalId: '',
            salaryPerMonth: 0,
            passportPhoto: '',
            message: '',
            placeFrom: '',
            allowance: 0,
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString()
          });
          saveStaff(staffList);
        }
      }

      pushAudit({ action: 'Created staff user', module: 'Users', target: employeeId });
      setToast('User created');
      setTimeout(() => setToast(''), 2000);
      setUserModal({ open: false, mode: 'create', userId: '' });
      return;
    }

    const list = Array.isArray(users) ? users.slice() : [];
    const idx = list.findIndex((u) => String(u?.id || '') === String(userModal.userId || ''));
    if (idx < 0) {
      setToast('User not found');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    const existing = list[idx];
    if (userModal.mode === 'reset') {
      if (!pass) {
        setToast('Password is required');
        setTimeout(() => setToast(''), 2000);
        return;
      }
      if (pass !== confirm) {
        setToast('Password confirmation does not match');
        setTimeout(() => setToast(''), 2000);
        return;
      }
      existing.password = pass;
      existing.forcePasswordChange = true;
    } else if (pass) {
      if (pass !== confirm) {
        setToast('Password confirmation does not match');
        setTimeout(() => setToast(''), 2000);
        return;
      }
      existing.password = pass;
    }
    list[idx] = {
      ...existing,
      fullName,
      staffEmployeeId: employeeId,
            roleId: staffRoleId,
      accessEnabled,
      email: emailValue || existing.email || '',
      phone: phoneValue || existing.phone || ''
    };
    saveUsers(list);
    try {
      const staffList = Array.isArray(staff) ? staff.slice() : [];
      const sidx = staffList.findIndex((s) => String(s?.employeeId || '').trim() === employeeId);
      if (sidx >= 0) {
        staffList[sidx] = {
          ...staffList[sidx],
          employeeId,
          fullName,
          email: emailValue || String(staffList[sidx]?.email || '')
        };
        saveStaff(staffList);
      }
    } catch {}
    pushAudit({ action: userModal.mode === 'reset' ? 'Reset user password' : 'Updated staff user', module: 'Users', target: employeeId });
    setUserModal({ open: false, mode: 'create', userId: '' });
  };

  const startDeleteUser = (staffUser) => {
    const employeeId = String(staffUser?.staffEmployeeId || '').trim();
    if (!employeeId) return;
    setDeleteUserModal({ open: true, employeeId, fullName: String(staffUser?.fullName || '').trim() });
  };

  const confirmDeleteUser = () => {
    if (deleteUserLoading) return;
    const employeeId = String(deleteUserModal.employeeId || '').trim();
    if (!employeeId) return;
    setDeleteUserLoading(true);
    window.setTimeout(() => {
      try {
        const list = Array.isArray(users) ? users.slice() : [];
        const nextUsers = list.filter(
          (u) =>
            !(
              String(u?.role || '').toLowerCase() === 'staff' &&
              String(u?.businessId || '') === String(businessId || '') &&
              String(u?.staffEmployeeId || '').trim() === employeeId
            )
        );
        saveUsers(nextUsers);
      } catch {}

      try {
        const staffList = Array.isArray(staff) ? staff.slice() : [];
        const nextStaff = staffList.filter((s) => String(s?.employeeId || '').trim() !== employeeId);
        saveStaff(nextStaff);
      } catch {}

      try {
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}

      pushAudit({ action: 'Deleted staff user', module: 'Users', target: employeeId });
      setDeleteUserLoading(false);
      setDeleteUserModal({ open: false, employeeId: '', fullName: '' });
    }, 5000);
  };

  const usersFiltered = useMemo(() => {
    const q = String(userSearch || '').trim().toLowerCase();
    const statusFilter = String(usersStatusFilter || 'all');
    const accessFilter = String(usersAccessFilter || 'all');
    const list = Array.isArray(staffUsers) ? staffUsers : [];
    const filtered = list.filter((u) => {
      const role = roleById.get(String(u.roleId || ''));
      const hasAccount = Boolean(u?._hasAccount);
      const active = hasAccount && u?.accessEnabled !== false;
      const statusKey = active ? 'active' : 'inactive';
      const accessKey = active ? 'enabled' : 'disabled';

      if (statusFilter !== 'all' && statusKey !== statusFilter) return false;
      if (accessFilter !== 'all' && accessKey !== accessFilter) return false;
      if (!q) return true;
      const blob = [u.fullName, u.staffEmployeeId, u.email, u.phone, role?.name]
        .map((x) => String(x || '').toLowerCase())
        .join(' ');
      return blob.includes(q);
    });

    const toTime = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return 0;
      const t = Date.parse(raw);
      return Number.isFinite(t) ? t : 0;
    };

    const sorted = filtered.slice();
    if (usersSort === 'name_desc') {
      sorted.sort((a, b) => String(b?.fullName || '').localeCompare(String(a?.fullName || '')));
    } else if (usersSort === 'date_desc') {
      sorted.sort((a, b) => toTime(b?.createdAt) - toTime(a?.createdAt));
    } else {
      sorted.sort((a, b) => String(a?.fullName || '').localeCompare(String(b?.fullName || '')));
    }
    return sorted;
  }, [roleById, staffUsers, userSearch, usersAccessFilter, usersSort, usersStatusFilter]);

  const usersPageSize = 8;

  const usersTotalPages = useMemo(() => {
    const total = usersFiltered.length;
    return Math.max(1, Math.ceil(total / usersPageSize));
  }, [usersFiltered.length]);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearch, usersAccessFilter, usersSort, usersStatusFilter]);

  useEffect(() => {
    setUsersPage((p) => Math.min(Math.max(1, p), usersTotalPages));
  }, [usersTotalPages]);

  const usersPageRows = useMemo(() => {
    const start = (usersPage - 1) * usersPageSize;
    return usersFiltered.slice(start, start + usersPageSize);
  }, [usersFiltered, usersPage]);

  const userStats = useMemo(() => {
    const total = staffUsers.length;
    let active = 0;
    staffUsers.forEach((u) => {
      const hasAccount = Boolean(u?._hasAccount);
      if (hasAccount && u?.accessEnabled !== false) active += 1;
    });
    const inactive = Math.max(0, total - active);
    return { total, active, inactive, onLeave: 0 };
  }, [staffUsers]);

  const formatJoinDate = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) return '—';
    try {
      return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return raw.slice(0, 10);
    }
  };

  const initials = (name) => {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    const init = parts.map((p) => p[0]?.toUpperCase()).join('');
    return init || 'U';
  };

  const toggleUserAccess = (staffUser, nextEnabled) => {
    if (!staffUser?._hasAccount) return;
    const id = String(staffUser?.id || '');
    if (!id) return;
    const list = Array.isArray(users) ? users.slice() : [];
    const idx = list.findIndex((u) => String(u?.id || '') === id);
    if (idx < 0) return;
    list[idx] = { ...list[idx], accessEnabled: Boolean(nextEnabled) };
    saveUsers(list);
  };

  const exportUsersCsv = () => {
    const rows = usersFiltered.map((u) => {
      const role = roleById.get(String(u?.roleId || ''));
      const hasAccount = Boolean(u?._hasAccount);
      const active = hasAccount && u?.accessEnabled !== false;
      return [
        String(u?.fullName || ''),
        String(u?.email || u?.phone || ''),
        active ? 'Active' : 'Deactive',
        String(role?.name || 'Staff'),
        String(u?.staffEmployeeId || '')
      ];
    });
    const header = ['Name', 'Email', 'Status', 'Role', 'EMP Number'];
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? '');
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_list.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-300 p-6 rounded-xl">
          <div className="text-lg font-semibold text-gray-900">Access denied</div>
          <div className="text-sm text-gray-600 mt-1">Only Admin can access Roles & Permissions.</div>
          <div className="mt-4">
            <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDeleteModal
        open={deleteUserModal.open}
        title="Delete User?"
        description="This user will be permanently deleted and cannot be recovered."
        confirmText="Delete"
        loading={deleteUserLoading}
        onCancel={() => (deleteUserLoading ? null : setDeleteUserModal({ open: false, employeeId: '', fullName: '' }))}
        onConfirm={confirmDeleteUser}
      />
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-normal text-gray-900">Employees</div>
            <div className="text-sm text-gray-600">Manage your {userStats.total.toLocaleString()} employees</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Total Employees</div>
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-normal text-gray-900">{userStats.total.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Active Employees</div>
              <div className="w-9 h-9 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-normal text-gray-900">{userStats.active.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">On Leave</div>
              <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Copy className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-normal text-gray-900">{userStats.onLeave.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Inactive Employees</div>
              <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-normal text-gray-900">{userStats.inactive.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-5 bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search employees by name, email or phone number"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={usersStatusFilter} onChange={(e) => setUsersStatusFilter(e.target.value)} className="w-full lg:w-44 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Select status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={usersAccessFilter} onChange={(e) => setUsersAccessFilter(e.target.value)} className="w-full lg:w-44 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Select Access</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <select value={usersSort} onChange={(e) => setUsersSort(e.target.value)} className="w-full lg:w-36 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="name_asc">Sort</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
              <option value="date_desc">Newest</option>
            </select>
            <button type="button" className="w-full lg:w-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50 inline-flex items-center justify-center gap-2" onClick={exportUsersCsv}>
              Export
            </button>
            {seatsIndicator ? <div className="hidden lg:block px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-900">{seatsIndicator}</div> : null}
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-600">
                  <th className="px-5 py-3">Employee Name &amp; Position</th>
                  <th className="px-5 py-3">EMP ID</th>
                  <th className="px-5 py-3">Password</th>
                  <th className="px-5 py-3">Mail &amp; Phone</th>
                  <th className="px-5 py-3">Joining Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">System Access</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersPageRows.map((u) => {
                  const role = roleById.get(String(u.roleId || ''));
                  const hasAccount = Boolean(u?._hasAccount);
                  const enabled = hasAccount && u.accessEnabled !== false;
                  const statusLabel = enabled ? 'Active' : 'Inactive';
                  const statusClass = enabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200';
                  return (
                    <tr key={String(u.id)} className="border-b border-gray-100">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm text-blue-700">
                            {initials(u.fullName)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">{String(u.fullName || '') || 'Employee'}</div>
                            <div className="text-xs text-gray-500 truncate">{String(role?.name || 'Staff')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-900">{String(u?.staffEmployeeId || '—')}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-900 break-all">{hasAccount ? String(u?.password || '—') : '—'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-900">{String(u.email || '—')}</div>
                        <div className="text-xs text-gray-600">{String(u.phone || '—')}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{formatJoinDate(u.createdAt)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs border ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Toggle checked={enabled} disabled={!hasAccount} onChange={(v) => toggleUserAccess(u, v)} />
                          <div className="text-sm text-gray-700">{enabled ? 'Enabled' : 'Disabled'}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                            onClick={() => (hasAccount ? openEditUser(u) : openCreateLoginForStaff(u))}
                            disabled={!hasAccount && seatsFull}
                          >
                            <Eye className="w-4 h-4 text-gray-700" />
                          </button>
                          <button
                            type="button"
                            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                            onClick={() => (hasAccount ? openEditUser(u) : openCreateLoginForStaff(u))}
                            disabled={!hasAccount && seatsFull}
                          >
                            <Pencil className="w-4 h-4 text-gray-700" />
                          </button>
                          <button
                            type="button"
                            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-200 hover:bg-red-50"
                            onClick={() => startDeleteUser(u)}
                          >
                            <Trash2 className="w-4 h-4 text-red-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {usersPageRows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-12 text-center text-sm text-gray-600" colSpan={8}>
                      No employees found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 flex items-center justify-end">
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(3, usersTotalPages) }).map((_, idx) => {
                const start = Math.max(1, Math.min(usersPage - 1, usersTotalPages - 2));
                const pageNum = start + idx;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={usersPage === pageNum ? 'w-9 h-9 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-900' : 'w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100'}
                    onClick={() => setUsersPage(pageNum)}
                  >
                    {String(pageNum).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ModalShell
        open={userModal.open}
        title={
          userModal.mode === 'createFromStaff'
            ? 'Create Login'
            : userModal.mode === 'create'
              ? 'Add New Staff'
              : userModal.mode === 'reset'
                ? 'Reset Password'
                : 'Edit Staff User'
        }
        subtitle={userModal.mode === 'reset' ? 'Set a new password for this user.' : userModal.mode === 'createFromStaff' ? 'Create a login for a registered staff member.' : 'Create staff accounts with role assignment and secure password controls.'}
        onClose={() => setUserModal({ open: false, mode: 'create', userId: '' })}
        widthClass="max-w-[920px]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-700">Full Name</div>
              <input value={userDraft.fullName} onChange={(e) => setUserDraft((p) => ({ ...p, fullName: e.target.value }))} disabled={userModal.mode === 'reset'} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-700">Email (optional)</div>
                <input value={userDraft.email} onChange={(e) => setUserDraft((p) => ({ ...p, email: e.target.value }))} disabled={userModal.mode === 'reset'} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700">Phone Number (optional)</div>
                <input value={userDraft.contact} onChange={(e) => setUserDraft((p) => ({ ...p, contact: e.target.value }))} disabled={userModal.mode === 'reset'} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-700">EMP Number</div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={userDraft.staffEmployeeId}
                    onChange={(e) => setUserDraft((p) => ({ ...p, staffEmployeeId: e.target.value }))}
                    disabled={userModal.mode !== 'create'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                  />
                  <button
                    type="button"
                    disabled={userModal.mode !== 'create'}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-60"
                    onClick={() => setUserDraft((p) => ({ ...p, staffEmployeeId: generateEmployeeId() }))}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700">Role</div>
                <div className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900">
                  Staff
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Status</div>
                <div className="mt-1 text-xs text-gray-600">{userDraft.accessEnabled ? 'Active' : 'Suspended'}</div>
              </div>
              <Toggle checked={userDraft.accessEnabled} onChange={(v) => setUserDraft((p) => ({ ...p, accessEnabled: v }))} disabled={userModal.mode === 'reset'} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-green-600" />
                Password
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <input
                  type="password"
                  value={userDraft.password}
                  onChange={(e) => setUserDraft((p) => ({ ...p, password: e.target.value }))}
                  placeholder={userModal.mode === 'edit' ? 'New password (optional)' : 'Password'}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="password"
                  value={userDraft.confirmPassword}
                  onChange={(e) => setUserDraft((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder={userModal.mode === 'edit' ? 'Confirm new password' : 'Confirm password'}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50" onClick={() => setUserModal({ open: false, mode: 'create', userId: '' })}>
                Cancel
              </button>
              <button
                type="button"
                disabled={(userModal.mode === 'create' || userModal.mode === 'createFromStaff') && seatsFull}
                className={(userModal.mode === 'create' || userModal.mode === 'createFromStaff') && seatsFull ? 'px-4 py-2 rounded-xl bg-green-600/60 text-white text-sm font-semibold cursor-not-allowed' : 'px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700'}
                onClick={createOrUpdateStaffUser}
              >
                {userModal.mode === 'create' ? 'Create User' : userModal.mode === 'reset' ? 'Reset Password' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </ModalShell>

      {toast ? <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-gray-900 text-white shadow-xl border border-white/10 text-sm font-semibold">{toast}</div> : null}
    </div>
  );
}
