import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { oauthApi, type OAuthProvider } from "@/api/oauth";
import { wechatIcon, wecomIcon, feishuIcon, dingtalkIcon } from "@/assets/icons";

interface OAuthButtonsProps {
  onSuccess: (tokens: { accessToken: string; refreshToken: string }) => void;
  onBindRequired?: (payload: {
    provider: string;
    providerUserId: string;
    tempToken: string;
  }) => void;
  onError?: (message: string) => void;
}

const OAUTH_BTN_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20";

const PROVIDER_ICON_MAP: Record<string, string> = {
  wechat: wechatIcon,
  wecom: wecomIcon,
  feishu: feishuIcon,
  dingtalk: dingtalkIcon,
};

export default function OAuthButtons({ onSuccess, onBindRequired, onError }: OAuthButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await oauthApi.getProviders();
        setProviders(data);
      } catch {
        // Backend not ready — silently hide OAuth section
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return;

      const { type, accessToken, refreshToken, provider, providerUserId, tempToken, message } =
        event.data || {};

      if (type === "OAUTH_SUCCESS") {
        if (accessToken && refreshToken) {
          popupRef.current?.close();
          onSuccess({ accessToken, refreshToken });
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
  }, [onSuccess, onBindRequired, onError]);

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
        <Loader2 size={16} className="animate-spin text-white/40" />
      </div>
    );
  }

  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/20" />
        <span className="text-xs text-white/50">其他登录方式</span>
        <div className="h-px flex-1 bg-white/20" />
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
              className={OAUTH_BTN_CLASS}
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
