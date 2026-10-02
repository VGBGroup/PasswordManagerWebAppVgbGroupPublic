import type { DecryptedInCredential } from '@/interfaces/decryptedCredential';

export function calculateAuditMetrics(items: DecryptedInCredential[]) {
  const weakItems = items.filter((i) => i.strength === 'weak');
  const fairItems = items.filter((i) => i.strength === 'fair');
  const atRisk = [...weakItems, ...fairItems];

  const passwordMap: Record<string, DecryptedInCredential[]> = {};
  items.forEach((item) => {
    if (!passwordMap[item.password]) passwordMap[item.password] = [];
    passwordMap[item.password].push(item);
  });

  const reusedItems = items.filter(
    (i) => (passwordMap[i.password]?.length ?? 0) > 1
  );

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const oldItems = items.filter((i) => new Date(i.updatedAt) <= cutoff);

  const totalIssues = atRisk.length + reusedItems.length + oldItems.length;

  const score = Math.max(
    0,
    Math.round(100 - (totalIssues / Math.max(items.length, 1)) * 80)
  );

  const breachedItems: DecryptedInCredential[] = [];

  return { atRisk, reusedItems, oldItems, breachedItems, totalIssues, score };
}