import { useEffect, useState } from "react";

import { fetchRaw } from "../api/request";

/**
 * Resolve an avatar URL for display.
 *
 * - External URLs (OAuth avatars) are returned as-is.
 * - Internal paths are fetched via the protected API endpoint so the request
 *   carries the Authorization header (handled by fetchRaw). The resulting Blob
 *   is turned into an object URL that is revoked on cleanup.
 */
export function useAvatar(
  userId: string | undefined,
  avatarUrl: string | null | undefined,
  revision = 0,
) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      setSrc(null);
      return;
    }

    // External URL (e.g. OAuth avatar)
    if (avatarUrl.startsWith("http")) {
      setSrc(avatarUrl);
      return;
    }

    if (!userId) {
      setSrc(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    // Cache-buster to avoid stale images after upload
    fetchRaw(`/users/${userId}/avatar`, { params: { _: String(Date.now()) } })
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, avatarUrl, revision]);

  return src;
}
