"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  History,
  Home,
  Timer,
} from "lucide-react";

import {
  getOpenRevision,
  revisionHref,
} from "@/lib/revision-storage";
import {
  getOpenSession,
  sessionHref,
} from "@/lib/session-storage";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/session", label: "Session", icon: Timer },
  { href: "/revisions", label: "Revise", icon: History },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/topics", label: "Topics", icon: BookOpen },
] as const;

function useNavLive() {
  const pathname = usePathname();
  const [sessionDest, setSessionDest] = useState("/session");
  const [sessionLive, setSessionLive] = useState(false);
  const [reviseDest, setReviseDest] = useState("/revisions");
  const [reviseLive, setReviseLive] = useState(false);

  useEffect(() => {
    function refresh() {
      const openStudy = getOpenSession();
      const openRev = getOpenRevision();
      setSessionDest(openStudy ? sessionHref(openStudy.id) : "/session");
      setSessionLive(Boolean(openStudy));
      setReviseDest(
        openRev ? revisionHref(openRev.revisionType, openRev.id) : "/revisions",
      );
      setReviseLive(Boolean(openRev));
    }
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("ririso:sessions-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("ririso:sessions-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [pathname]);

  return { sessionDest, sessionLive, reviseDest, reviseLive };
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/session") {
    return pathname === "/session" || pathname.startsWith("/session/");
  }
  if (href === "/revisions") {
    return (
      pathname === "/revisions" ||
      pathname.startsWith("/revisions") ||
      pathname === "/revision" ||
      pathname.startsWith("/revision")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const { sessionDest, sessionLive, reviseDest, reviseLive } = useNavLive();

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-paper/95 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-0.5 py-1">
          {links.map(({ href, label, icon: Icon }) => {
            const dest =
              href === "/session"
                ? sessionDest
                : href === "/revisions"
                  ? reviseDest
                  : href;
            const active = isActivePath(pathname, href);
            const live =
              (href === "/session" && sessionLive) ||
              (href === "/revisions" && reviseLive);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={dest}
                  className={`touch-target relative flex flex-col items-center justify-center gap-0.5 rounded-[18px] px-0.5 py-2 text-[10px] transition-transform active:scale-95 ${
                    active
                      ? "bg-pastel-pink/60 text-charcoal font-semibold"
                      : "text-muted"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{label}</span>
                  {live ? (
                    <span
                      aria-hidden
                      className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pastel-green-deep"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-border-soft bg-paper/90 p-6 backdrop-blur-sm md:block"
      >
        <p className="font-display text-xl font-semibold tracking-tight text-charcoal">
          RIRISO
        </p>
        <p className="mt-1 text-caption">Study with softness</p>
        <ul className="mt-8 flex flex-col gap-2">
          {links.map(({ href, label, icon: Icon }) => {
            const dest =
              href === "/session"
                ? sessionDest
                : href === "/revisions"
                  ? reviseDest
                  : href;
            const active = isActivePath(pathname, href);
            const live =
              (href === "/session" && sessionLive) ||
              (href === "/revisions" && reviseLive);
            return (
              <li key={href}>
                <Link
                  href={dest}
                  className={`touch-target flex items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                    active
                      ? "bg-pastel-pink/70 font-semibold text-charcoal"
                      : "text-muted hover:bg-ivory"
                  }`}
                >
                  <span className="relative">
                    <Icon size={18} strokeWidth={1.75} />
                    {live ? (
                      <span
                        aria-hidden
                        className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-pastel-green-deep"
                      />
                    ) : null}
                  </span>
                  {label === "Revise" ? "Revisions" : label}
                  {live ? (
                    <span className="ml-auto text-[10px] font-semibold text-pastel-green-deep">
                      Live
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
