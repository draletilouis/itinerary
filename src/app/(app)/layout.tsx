import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/server/auth/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();
  return (
    <AppShell
      user={{
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
