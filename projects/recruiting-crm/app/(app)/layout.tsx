import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { FloatingNotepad } from "@/components/notepad/floating-notepad";
import { FloatingCalendar } from "@/components/calendar/floating-calendar";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const isAdmin = !!(session.user as { isAdmin?: boolean })?.isAdmin;
  const isManager = !!(session.user as { isManager?: boolean })?.isManager;
  const isElevated = isAdmin || isManager;

  // Fetch user's saved color theme from DB — applied before first paint
  const userId = (session.user as { id?: string })?.id;
  let colorTheme: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { colorTheme: true },
    });
    colorTheme = user?.colorTheme ?? null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Apply the user's saved theme immediately — before React hydration */}
      {colorTheme && (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-theme','${colorTheme}');`,
          }}
        />
      )}
      <NavBar user={session.user} isElevated={isElevated} />
      <main className="w-full px-6 lg:px-10 py-8">
        {children}
      </main>
      <FloatingCalendar />
      <FloatingNotepad />
    </div>
  );
}
