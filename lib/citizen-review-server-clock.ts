export function getCitizenReviewServerNowIso(): string {
  const realNowIso = new Date().toISOString();
  if (process.env.CHALLANSAKSHI_BROWSER_ACCEPTANCE !== '1') return realNowIso;

  const candidate = process.env.CHALLANSAKSHI_ACCEPTANCE_NOW_ISO;
  if (!candidate || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(candidate)) return realNowIso;

  const parsed = new Date(candidate);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === candidate ? candidate : realNowIso;
}
