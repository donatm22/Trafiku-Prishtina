import { redirect } from "next/navigation";
import { prishtinaAuthUrl } from "../../lib/prishtina-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const query = await searchParams;
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : "/";
  redirect(prishtinaAuthUrl("login", returnTo));
}
