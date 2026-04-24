const KEY = 'signupDraft';
let sensitiveFormState = null;

const sanitizeFormData = (formData) => {
  const next = formData && typeof formData === 'object' ? { ...formData } : {};
  delete next.password;
  delete next.confirmPassword;
  return next;
};

const extractSensitiveFormState = (formData) => {
  const source = formData && typeof formData === 'object' ? formData : {};
  const password = String(source.password || '');
  const confirmPassword = String(source.confirmPassword || '');
  if (!password && !confirmPassword) return null;
  return { password, confirmPassword };
};

export const getSignupDraft = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    const mergedFormData = {
      ...(parsed.formData && typeof parsed.formData === 'object' ? parsed.formData : {}),
      ...(sensitiveFormState || {})
    };
    return {
      ...parsed,
      formData: mergedFormData
    };
  } catch {
    return null;
  }
};

export const setSignupDraft = (draft) => {
  try {
    const nextDraft = draft && typeof draft === 'object' ? { ...draft } : null;
    sensitiveFormState = extractSensitiveFormState(nextDraft?.formData);
    const storedDraft = nextDraft
      ? {
          ...nextDraft,
          formData: sanitizeFormData(nextDraft.formData)
        }
      : null;
    window.localStorage.setItem(KEY, JSON.stringify(storedDraft));
  } catch {}
};

export const clearSignupDraft = () => {
  sensitiveFormState = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
};
