import type { Metadata } from "next";
import Link from "next/link";
import { getProfile, getUser } from "@/lib/profile";
import AccountMenu from "@/components/AccountMenu";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  /*
   * The name first, then what it is. "Eloquence" alone tells a search
   * result or a shared link nothing, and this is the text both of
   * those show.
   */
  title: "Eloquence — Indian diet & workout planner",
  description:
    "Calculates your calorie and protein targets, then builds a week of Indian meals and a training plan around them.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  // Only for the name in the header; everything else here is the user record.
  const profile = user ? await getProfile() : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ---------------------------------------------------------------
            The name, on every page.

            Here rather than in each page's own header: there are five of
            them, they are laid out differently, and a wordmark that moves
            or goes missing between pages reads as a bug. Kept quiet — a
            planner is a tool, and the heading people need on each page is
            the one about their food, not the name of the thing showing
            it to them.
            --------------------------------------------------------------- */}
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-6 pb-2">
          {/* ---------------------------------------------------------
              The name, given some presence.

              It was set at the same size as the sign-in link beside it,
              which made the product name read as one more piece of
              navigation. A mark to anchor it and a real type size fix
              that without turning the header into a banner — the plan
              is still what the page is for.
              --------------------------------------------------------- */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-contrast">
              E
            </span>
            <span className="text-xl font-semibold tracking-tight">Eloquence</span>
          </Link>
          {/* Signed in, this says WHICH account — "Your plan" told you
              somebody was signed in but not who, and on an app built
              from your own weight that is the wrong thing to leave
              ambiguous. Signed out, it is the way in. */}
          {user?.email ? (
            <AccountMenu email={user.email} name={profile?.name ?? ""} />
          ) : (
            <Link
              href="/login"
              className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
