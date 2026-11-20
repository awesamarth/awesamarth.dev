import type { Metadata } from "next";

// Not meant for search results; crawlers can still open it to see this.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
