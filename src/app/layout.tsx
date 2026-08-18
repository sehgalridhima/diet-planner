import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/profile";
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
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight transition-opacity hover:opacity-70"
          >
            Eloquence
          </Link>
          {/* The one link that belongs beside the name on every page.
              It was on the home page only, in its own row, which put it
              on a second line under the wordmark with nothing between. */}
          <Link
            href={user ? "/today" : "/login"}
            className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
          >
            {user ? "Your plan" : "Sign in"}
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
