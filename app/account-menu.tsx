"use client";

import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import type { PrishtinaUser } from "../lib/prishtina-auth";

export function AccountMenu() {
  const [user, setUser] = useState<PrishtinaUser | null | undefined>(undefined);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { headers: { accept: "application/json" }, cache: "no-store" })
      .then(async (response) => await response.json() as { user?: PrishtinaUser | null })
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <span className="account-loading" aria-label="Duke kontrolluar llogarinë"><i /></span>;
  }

  if (!user) {
    return (
      <div className="account-links">
        <a className="button button-ghost button-small" href="/login?returnTo=/">Kyçu</a>
        <a className="account-register-link" href="/register?returnTo=/">Regjistrohu</a>
      </div>
    );
  }

  return (
    <div className="account-signed-in">
      <span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
      <span className="account-name"><small>Prishtina.online</small><strong>{user.name}</strong></span>
      <button
        className="account-logout"
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.reload();
        }}
        aria-label="Dil nga llogaria"
      >
        <LogOut size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

export function MobileAccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => await response.json() as { user?: PrishtinaUser | null })
      .then((data) => setSignedIn(Boolean(data.user)))
      .catch(() => setSignedIn(false));
  }, []);
  return (
    <a href={signedIn ? "https://prishtina.online/dashboard" : "/login?returnTo=/"} id="llogaria">
      <span aria-hidden="true"><UserRound size={19} /></span>{signedIn ? "Llogaria" : "Kyçu"}
    </a>
  );
}
