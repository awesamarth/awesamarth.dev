import { GithubIcon, Linkedin, LinkedinIcon, LucideLinkedin, MailIcon, TwitterIcon } from 'lucide-react';
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
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-accent"
      >
        <GithubIcon className="h-5 w-5 fill-current stroke-current" />
      </Link>

      <Link
        target="_blank" rel="noreferrer noopener"
        href="https://twitter.com/awesamarth_"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-accent"
      >
        <div className="relative h-5 w-5">
          <Image 
            src="/xlogo.png" 
            alt="X Logo" 
            fill 
            className={`object-contain x-logo`}
          />
        </div>
      </Link>



      <Link
        target="_blank" rel="noreferrer noopener"
        href="https://warpcast.com/awesamarth"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-accent"
      >
        <svg
          className="h-6 w-6"
          aria-hidden="true"
          viewBox="0 0 225 225"
          fill="none"
        >
          <rect width="225" height="225" rx="50"></rect>
          <path
            d="M58 35H167V190H151V119H150.843C149.075 99.3773 132.583 84 112.5 84C92.4169 84 75.9253 99.3773 74.157 119H74V190H58V35Z"
            className="fill-farcaster"
          ></path>
          <path
            d="M29 57L35.5 79H41V168C38.2386 168 36 170.239 36 173V179H35C32.2386 179 30 181.239 30 184V190H86V184C86 181.239 83.7614 179 81 179H80V173C80 170.239 77.7614 168 75 168H69V57H29Z"
            className="fill-farcaster"
          ></path>
          <path
            d="M152 168C149.239 168 147 170.239 147 173V179H146C143.239 179 141 181.239 141 184V190H197V184C197 181.239 194.761 179 192 179H191V173C191 170.239 188.761 168 186 168V79H191.5L198 57H158V168H152Z"
            className="fill-farcaster"
          ></path>
        </svg>
      </Link>

      <Link
        target="_blank" rel="noreferrer noopener"
        href="https://linkedin.com/in/awesamarth"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-accent"
      >
        < LucideLinkedin className="h-5 w-5 fill-linkedin stroke-linkedin" />
      </Link>

      <Link
        target="_blank" rel="noreferrer noopener"
        href="mailto:samarthsaxena1672003@gmail.com"
        className="flex h-10 w-10 items-center justify-center rounded-md p-1 transition-all hover:bg-accent"
      >
        <MailIcon className="h-5 w-5 fill-email stroke-accent" />
      </Link>
    </nav>
  );
}