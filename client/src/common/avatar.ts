/**
 * INSTASQUAD — Utility xử lý địa chỉ Avatar (Đợt E2)
 */

export function resolveAvatarUrl(url?: string | null, version?: number | string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;

  let resolved = url;
  if (version !== undefined && version !== null) {
    const [base] = resolved.split('?');
    resolved = `${base}?v=${version}`;
  }
  return resolved;
}
