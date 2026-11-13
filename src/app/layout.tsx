import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider"
import { headers } from 'next/headers'
import { DoomEasterEgg } from '@/components/DoomEasterEgg'
import { DoomEffects } from '@/components/DoomEffects'
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import ContextProvider from "@/context";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  weight: '400',
  variable: '--font-doom',
  subsets: ['latin'],
});



const siteUrl = "https://www.awesamarth.dev";
const siteDescription =
  "Samarth Saxena (awesamarth) is a full-stack engineer from India building AI agents, developer tools and onchain apps, including Privy CLI, Agentis and Watchdog.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Samarth Saxena (awesamarth) | Full-Stack Engineer",
    template: "%s | Samarth Saxena",
  },
  description: siteDescription,
  authors: [{ name: "Samarth Saxena", url: siteUrl }],
  creator: "Samarth Saxena",
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: siteUrl,
    siteName: "Samarth Saxena",
    title: "Samarth Saxena (awesamarth) | Full-Stack Engineer",
    description: siteDescription,
    firstName: "Samarth",
    lastName: "Saxena",
    username: "awesamarth",
  },
  twitter: {
    card: "summary",
    creator: "@awesamarth_",
    title: "Samarth Saxena (awesamarth) | Full-Stack Engineer",
    description: siteDescription,
  },
};

// Tells search engines which "Samarth Saxena" this is and links his profiles together.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Samarth Saxena",
  alternateName: "awesamarth",
  url: siteUrl,
  jobTitle: "Full-Stack Engineer",
  description: siteDescription,
  nationality: { "@type": "Country", name: "India" },
  knowsAbout: ["AI agents", "Developer tools", "TypeScript", "Ethereum", "Solana", "Web3"],
  sameAs: [
    "https://github.com/awesamarth",
    "https://x.com/awesamarth_",
    "https://www.linkedin.com/in/awesamarth",
    "https://www.youtube.com/@awesamarth",
    "https://t.me/awesamarth",
    "https://www.npmjs.com/~awesamarth",
  ],
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers()
  const cookies = headersList.get('cookie')

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ContextProvider cookies={cookies}>
            <DoomEasterEgg />
            <DoomEffects />

            <Navbar />
            {children}
            <Footer />
          </ContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
