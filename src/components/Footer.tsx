'use client'

import { GithubIcon, MailIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export function Footer() {
  const { theme } = useTheme();

  return (
    <nav className="flex items-center justify-center gap-4 py-3 text-sm bg-[#f2f2f2] dark:bg-[#0e0e0e]">

      <Link
        target="_blank" rel="noreferrer noopener"
        href="https://github.com/awesamarth"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-gray-200 dark:hover:bg-accent"
      >
        <GithubIcon className={`h-5 w-5 ${theme == "light" ? "fill-white stroke-github" : "fill-white stroke-white"} fill-github stroke-github`} />
      </Link>

      <Link
        target="_blank" rel="noreferrer noopener"
        href="https://twitter.com/awesamarth_"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-gray-200 dark:hover:bg-accent"
      >
        <div className="relative h-5 w-5">
          <Image
            src="/xlogo.png"
            alt="X Logo"
            fill
            className={`object-contain x-logo
              `}
          />
        </div>
      </Link>


      <Link
        target="_blank"
        rel="noreferrer noopener"
        href="https://linkedin.com/in/awesamarth"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-gray-200 dark:hover:bg-accent"
      >
        <div className="relative h-5 w-5">
          <Image
            src="/linkedin-logo.png"
            alt="LinkedIn Logo"
            fill
            className="object-contain linkedin-logo"
          />
        </div>
      </Link>

      <Link
        target="_blank"
        rel="noreferrer noopener"
        href="https://t.me/awesamarth"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-gray-200 dark:hover:bg-accent"
      >
        <div className="relative h-5 w-5">
          <Image
            src="/telegram-logo.png"
            alt="Telegram Logo"
            fill
            className="object-contain telegram-logo"
          />
        </div>
      </Link>

      <Link
        target="_blank" rel="noreferrer noopener"
        href="mailto:samarthsaxena1672003@gmail.com"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-gray-200 dark:hover:bg-accent"
      >
        <MailIcon className="h-5 w-5 fill-email stroke-accent" />
      </Link>
    </nav>
  );
}