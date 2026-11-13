import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Writings",
  description: "Articles and technical writing by Samarth Saxena.",
  alternates: { canonical: "/writings" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
