import { useEffect, useState } from "react";

function getToken(): string | null {
  return localStorage.getItem("accessToken");
}

/**
 * Resolve an avatar URL for display.
 *
 * - External URLs (OAuth avatars) are returned as-is.
 * - Internal paths are fetched via the protected API endpoint so the request
 *   carries the Authorization header. The resulting Blob is turned into an
 *   object URL that is revoked on cleanup.
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

    const token = getToken();
    if (!token) {
      setSrc(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    // Cache-buster to avoid stale images after upload
    const cacheBust = Date.now();

    const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";
    const endpoint = baseUrl
      ? `${baseUrl}/api/users/${userId}/avatar`
      : `/api/users/${userId}/avatar`;

    fetch(`${endpoint}?_=${cacheBust}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load avatar");
        return res.blob();
      })
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
