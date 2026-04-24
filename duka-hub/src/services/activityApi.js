import { authenticatedApiRequest } from './authApi';

const normalizeText = (value) => String(value || '').trim();

const mapBackendLog = (log) => {
  const user = log?.user && typeof log.user === 'object' ? log.user : null;
  const actor = user
    ? {
        fullName: normalizeText(user.fullName),
        employeeId: normalizeText(user.employeeId),
        role: normalizeText(user.roleLabel)
      }
    : null;

  return {
    id: String(log?.id || ''),
    action: normalizeText(log?.action),
    title: normalizeText(log?.title),
    details: normalizeText(log?.details),
    entityType: normalizeText(log?.entityType),
    entityId: normalizeText(log?.entityId),
    module: normalizeText(log?.entityType),
    createdAt: normalizeText(log?.createdAt),
    ts: normalizeText(log?.createdAt),
    actor,
    actorHint: actor
  };
};

export const activityApi = {
  async list({ limit = 200 } = {}) {
    const data = await authenticatedApiRequest(`/activity-logs?limit=${encodeURIComponent(String(limit || 200))}`);
    const logs = Array.isArray(data?.logs) ? data.logs : [];
    return logs.map(mapBackendLog);
  }
};
