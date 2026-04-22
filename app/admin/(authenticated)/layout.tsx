import { AdminLayoutShell } from "@/components/admin/AdminLayoutShell";

export const metadata = {
  title: "Admin | Kary Curadoria",
};

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
