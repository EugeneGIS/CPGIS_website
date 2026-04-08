import { AuthForm } from "@/components/auth/auth-form";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";

export default async function SignInPage() {
  const session = await getSessionContext();

  return (
    <>
      <SiteHeader session={session} />
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#eef6f8_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <AuthForm />
      </main>
    </>
  );
}
