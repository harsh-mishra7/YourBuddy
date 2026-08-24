/**
 * The signed-out shell: no nav, no reminders, nothing that needs a user.
 */

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-12">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your<span className="text-primary">Buddy</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A place for whatever&rsquo;s in your head — dated or not.
        </p>
      </div>
      {children}
    </main>
  );
}
