/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { cn } from "@/lib/utils";

export interface SettingsSection {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  content: React.ReactNode;
}

interface SettingsPageProps {
  sections: SettingsSection[];
  loading?: boolean;
  header?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function SettingsPage({ sections, loading, header, actions }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isManualScrolling = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll spy
  useEffect(() => {
    const scrollContainer = containerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (isManualScrolling.current) return;
      const containerTop = scrollContainer.getBoundingClientRect().top;
      let current = sections[0]?.id ?? "";

      for (const s of sections) {
        const el = sectionRefs.current[s.id];
        if (el) {
          const elTop = el.getBoundingClientRect().top;
          if (elTop <= containerTop + 80) {
            current = s.id;
          }
        }
      }
      const isAtBottom =
        scrollContainer.scrollHeight - scrollContainer.scrollTop <=
        scrollContainer.clientHeight + 2;
      if (isAtBottom) {
        current = sections[sections.length - 1]?.id ?? current;
      }
      setActiveSection(current);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [sections]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    const scrollContainer = containerRef.current;
    if (!el || !scrollContainer) return;

    const isOverflowing = scrollContainer.scrollHeight > scrollContainer.clientHeight + 2;
    if (!isOverflowing) {
      setActiveSection(id);
      return;
    }

    isManualScrolling.current = true;
    setActiveSection(id);

    const containerRect = scrollContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const currentScrollTop = scrollContainer.scrollTop;

    const isAbove = elRect.top < containerRect.top + 10;
    const isBelow = elRect.bottom > containerRect.bottom - 10;

    if (isAbove || isBelow) {
      const offset = elRect.top - containerRect.top + currentScrollTop - 16;
      scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
    }

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      isManualScrolling.current = false;
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-8 pr-14 pb-12">
        <div className="mx-auto max-w-[1440px] space-y-6">
          {header}
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} ref={(el) => (sectionRefs.current[s.id] = el)}>
                <Card className="border-border bg-card overflow-hidden border shadow-sm">
                  <CardHeader className="border-border/50 border-b px-6">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-primary" />
                      <CardTitle className="text-foreground text-base font-bold">
                        {s.label}
                      </CardTitle>
                    </div>
                    {s.description && (
                      <CardDescription className="text-xs">{s.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6 px-6 pt-6">{s.content}</CardContent>
                </Card>
              </div>
            );
          })}
          {actions}
        </div>
      </div>

      {/* Right nav */}
      {sections.length > 1 && (
        <nav className="group/nav hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-50 flex-col items-end gap-2 pl-12 py-4">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <div key={s.id} className="group/item relative flex h-8 w-8 items-center justify-end">
                <button
                  onClick={() => scrollTo(s.id)}
                  aria-label={s.label}
                  className={cn(
                    "absolute right-0 flex items-center justify-center gap-1.5 rounded-full transition-all duration-300 overflow-hidden",
                    isActive
                      ? "h-[3px] w-8 bg-primary group-hover/nav:h-8 group-hover/nav:w-auto group-hover/nav:px-3 group-hover/nav:text-primary-foreground"
                      : "h-[3px] w-3 bg-muted-foreground/20 group-hover/nav:h-8 group-hover/nav:w-auto group-hover/nav:px-3 group-hover/nav:bg-muted group-hover/nav:text-foreground group-hover/item:!bg-primary group-hover/item:!text-primary-foreground",
                  )}
                >
                  <Icon
                    size={14}
                    className="shrink-0 opacity-0 group-hover/nav:opacity-100 transition-opacity"
                  />
                  <span className="whitespace-nowrap text-xs font-medium opacity-0 group-hover/nav:opacity-100 transition-opacity">
                    {s.label}
                  </span>
                </button>
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}
