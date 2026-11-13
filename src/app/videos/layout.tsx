import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Videos",
  description: "Videos and talks by Samarth Saxena on AI agents, developer tools and web3.",
  alternates: { canonical: "/videos" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
