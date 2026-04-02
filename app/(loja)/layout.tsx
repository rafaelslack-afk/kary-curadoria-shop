import { Navbar } from "@/components/loja/navbar";
import { Footer } from "@/components/loja/footer";
import { WhatsAppFloat } from "@/components/loja/whatsapp-float";
import { isStorePrelaunchActive } from "@/lib/store-launch";

export const revalidate = 60;

interface NavLink {
  id: string;
  label: string;
  href: string;
}

const FALLBACK_LINKS: NavLink[] = [
  { id: "1", label: "Coleções", href: "/produtos" },
  { id: "2", label: "Linho", href: "/produtos?categoria=conjuntos-de-linho" },
  { id: "3", label: "Alfaiataria", href: "/produtos?categoria=alfaiataria-casual" },
  { id: "4", label: "Nossa Loja", href: "/#nossa-loja" },
];

async function getNavLinks(): Promise<NavLink[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/nav-links`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return FALLBACK_LINKS;
    const data: NavLink[] = await res.json();
    return data.length > 0 ? data : FALLBACK_LINKS;
  } catch {
    return FALLBACK_LINKS;
  }
}

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isStorePrelaunchActive()) {
    return <div className="min-h-screen">{children}</div>;
  }

  const navLinks = await getNavLinks();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar navLinks={navLinks} />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
