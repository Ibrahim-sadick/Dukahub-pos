export const waitFor = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, Number(ms || 0)));
  });

export const withMinimumDelay = async (work, minimumMs = 7000) => {
  const startedAt = Date.now();
  try {
    return await work();
  } finally {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, Number(minimumMs || 0) - elapsed);
    if (remaining > 0) {
      await waitFor(remaining);
    }
  }
};
