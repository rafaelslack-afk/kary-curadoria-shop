import { Navbar } from "@/components/loja/navbar";
import { Footer } from "@/components/loja/footer";
import { WhatsAppFloat } from "@/components/loja/whatsapp-float";
import { isStorePrelaunchActive } from "@/lib/store-launch";

export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isStorePrelaunchActive()) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
