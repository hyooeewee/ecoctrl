import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { oauthApi, type OAuthProvider } from "@/api/oauth";
import { wechatIcon, wecomIcon, feishuIcon, dingtalkIcon } from "@/assets/icons";

interface OAuthButtonsProps {
  onSuccess?: (tokens: { accessToken: string; refreshToken: string }) => void;
  onBindRequired?: (payload: {
    provider: string;
    providerUserId: string;
    tempToken: string;
  }) => void;
  onError?: (message: string) => void;
  onLinked?: () => void;
  onProvidersLoaded?: (providers: OAuthProvider[]) => void;
  excludeProviders?: string[];
  label?: string;
  theme?: "dark" | "light";
}

const THEME_STYLES = {
  dark: {
    btn: "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
    divider: "bg-white/20",
    label: "text-white/50",
    spinner: "text-white/40",
  },
  light: {
    btn: "border-border bg-muted/30 text-foreground hover:bg-muted/50",
    divider: "bg-border",
    label: "text-muted-foreground",
    spinner: "text-muted-foreground",
  },
};

const PROVIDER_ICON_MAP: Record<string, string> = {
  wechat: wechatIcon,
  wecom: wecomIcon,
  feishu: feishuIcon,
  dingtalk: dingtalkIcon,
};

export default function OAuthButtons({
  onSuccess,
  onBindRequired,
  onError,
  onLinked,
  onProvidersLoaded,
  excludeProviders,
  label = "其他登录方式",
  theme = "dark",
}: OAuthButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const popupRef = useRef<Window | null>(null);
  const styles = THEME_STYLES[theme];

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await oauthApi.getProviders();
        const filtered = excludeProviders
          ? data.filter((p) => !excludeProviders.includes(p.id))
          : data;
        setProviders(filtered);
        onProvidersLoaded?.(filtered);
      } catch {
        // Backend not ready — silently hide OAuth section
        onProvidersLoaded?.([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, [excludeProviders, onProvidersLoaded]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return;

      const { type, accessToken, refreshToken, provider, providerUserId, tempToken, message } =
        event.data || {};

      if (type === "OAUTH_SUCCESS") {
        popupRef.current?.close();
        if (onLinked) {
          onLinked();
        } else if (accessToken && refreshToken) {
          onSuccess?.({ accessToken, refreshToken });
        }
      } else if (type === "OAUTH_BIND_REQUIRED") {
        popupRef.current?.close();
        if (onBindRequired && provider && providerUserId && tempToken) {
          onBindRequired({ provider, providerUserId, tempToken });
        }
      } else if (type === "OAUTH_ERROR") {
        popupRef.current?.close();
        onError?.(message || "OAuth login failed");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onBindRequired, onError, onLinked]);

  const handleOAuthLogin = (providerId: string) => {
    const redirectUri = `${window.location.origin}/oauth/callback`;
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const apiPrefix = import.meta.env.VITE_API_PREFIX || "/api";
    const url = `${apiBase}${apiPrefix}/auth/oauth/${providerId}/authorize?redirectUri=${encodeURIComponent(redirectUri)}`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    popupRef.current?.close();
    popupRef.current = window.open(
      url,
      "oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 size={16} className={`animate-spin ${styles.spinner}`} />
      </div>
    );
  }

  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`h-px flex-1 ${styles.divider}`} />
        <span className={`text-xs ${styles.label}`}>{label}</span>
        <div className={`h-px flex-1 ${styles.divider}`} />
      </div>

      <div className="flex items-center justify-center gap-3">
        {providers.map((provider) => {
          const iconSrc = PROVIDER_ICON_MAP[provider.id];

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleOAuthLogin(provider.id)}
              title={provider.name}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${styles.btn}`}
            >
              {iconSrc ? (
                <img src={iconSrc} alt={provider.name} className="h-5 w-5" loading="lazy" />
              ) : (
                <span className="text-sm font-bold">{provider.name.slice(0, 1)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
