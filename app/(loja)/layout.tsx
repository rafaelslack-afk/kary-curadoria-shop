import { Navbar } from "@/components/loja/navbar";
import { Footer } from "@/components/loja/footer";
import { WhatsAppFloat } from "@/components/loja/whatsapp-float";

export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
