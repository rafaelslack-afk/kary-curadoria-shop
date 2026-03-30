// Layout raiz do /admin — sem sidebar.
// A sidebar fica exclusivamente em (authenticated)/layout.tsx.
// Esta camada existe apenas para fornecer metadata base.
export const metadata = {
  title: {
    default: "Admin | Kary Curadoria",
    template: "%s | Admin KVO",
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
