// components/Navbar.tsx
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle"; // Import ModeToggle component

export default function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="w-full py-6 z-[9999] px-20 fixed top-0 dark:bg-[#0e0e0e] bg-[#f2f2f2] ">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/projects" className="text- text-sm font-medium transition-colors hover:text-primary">
            Projects
          </Link>
          <Link href="/writings" className="text-sm font-medium transition-colors hover:text-primary">
            Writings
          </Link>
          <Link href="/videos" className="text-sm font-medium transition-colors hover:text-primary">
            Videos
          </Link>
          <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary">
            Contact
          </Link>
        </div>
        
        {/* Add ModeToggle on the right side */}
        <ModeToggle />
      </div>
    </nav>
  );
}