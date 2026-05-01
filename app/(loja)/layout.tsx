import { Navbar } from "@/components/loja/navbar";
import { Footer } from "@/components/loja/footer";
import { WhatsAppFloat } from "@/components/loja/whatsapp-float";
import { FloatingCoupon } from "@/components/loja/floating-coupon";
import { isStorePrelaunchActive } from "@/lib/store-launch";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60;

interface NavLink {
  id: string;
  label: string;
  href: string;
}

interface FloatingCouponData {
  code: string;
  floating_title: string | null;
  floating_description: string | null;
  value: number;
  type: "percent" | "fixed";
}

const FALLBACK_LINKS: NavLink[] = [
  { id: "1", label: "Coleções", href: "/produtos" },
  { id: "2", label: "Linho", href: "/produtos?categoria=conjuntos-de-linho" },
  { id: "3", label: "Alfaiataria", href: "/produtos?categoria=alfaiataria-casual" },
  { id: "4", label: "Nossa Loja", href: "/#nossa-loja" },
];

async function getNavLinks(): Promise<NavLink[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("nav_links")
      .select("id, label, href")
      .eq("active", true)
      .order("order_index", { ascending: true });

    if (error || !data || data.length === 0) return FALLBACK_LINKS;
    return data;
  } catch {
    return FALLBACK_LINKS;
  }
}

async function getFloatingCoupon(): Promise<FloatingCouponData | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coupons")
      .select("code, floating_title, floating_description, value, type")
      .eq("is_floating", true)
      .eq("active", true)
      .single();
    return data ?? null;
  } catch {
    return null;
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

  const [navLinks, floatingCoupon] = await Promise.all([
    getNavLinks(),
    getFloatingCoupon(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar navLinks={navLinks} />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
      {floatingCoupon && <FloatingCoupon initialData={floatingCoupon} />}
    </div>
  );
}
