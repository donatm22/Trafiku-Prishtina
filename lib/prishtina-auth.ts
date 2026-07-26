export type PrishtinaUser = {
  email: string;
  name: string;
};

const authOrigin = process.env.PRISHTINA_AUTH_ORIGIN ?? "https://prishtina.online";
const trafikuOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://trafiku.prishtina.online";

export async function getPrishtinaUser(cookieHeader: string | null): Promise<PrishtinaUser | null> {
  if (!cookieHeader) return null;
  try {
    const response = await fetch(`${authOrigin}/api/sso/session`, {
      headers: { accept: "application/json", cookie: cookieHeader },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    const data = await response.json() as { user?: PrishtinaUser | null };
    return data.user?.email ? data.user : null;
  } catch {
    return null;
  }
}

export function prishtinaAuthUrl(mode: "login" | "register", returnTo: string | undefined): string {
  const safePath = safeRelativePath(returnTo);
  const callbackUrl = new URL(safePath, trafikuOrigin).toString();
  const url = new URL(`/${mode}`, authOrigin);
  url.searchParams.set("returnTo", callbackUrl);
  return url.toString();
}

function safeRelativePath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const parsed = new URL(value, "https://trafiku.local");
    return parsed.origin === "https://trafiku.local"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/";
  } catch {
    return "/";
  }
}
