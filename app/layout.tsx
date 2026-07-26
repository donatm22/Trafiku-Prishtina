import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Footer, Header, MobileNavigation } from "./site-shell";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "trafiku.prishtina.online";
  const protocol = host.includes("localhost") ? "http" : "https";
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: { default: "Trafiku Prishtina", template: "%s | Trafiku Prishtina" },
    description: "Raportime të drejtpërdrejta për kolonat, aksidentet, rrugët e mbyllura dhe rreziqet në Prishtinë.",
    applicationName: "Trafiku Prishtina",
    openGraph: {
      type: "website",
      locale: "sq_XK",
      siteName: "Trafiku Prishtina",
      title: "Shihe trafikun. Raporto çfarë po ndodh.",
      description: "Harta e komunitetit për lëvizje më të informuar në Prishtinë.",
    },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sq">
      <body>
        <a className="skip-link" href="#main-content">Kalo te përmbajtja</a>
        <Header />
        <div id="main-content">{children}</div>
        <Footer />
        <MobileNavigation />
      </body>
    </html>
  );
}
