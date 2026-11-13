import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Open-source projects by Samarth Saxena: AI agents, developer tools and onchain apps.",
  alternates: { canonical: "/projects" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
