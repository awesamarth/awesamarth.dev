// pages/contact.tsx or app/contact/page.tsx (depending on your Next.js version)
'use client'
import Head from "next/head";
import Link from "next/link";
import { GithubIcon, MailIcon, TwitterIcon } from "lucide-react";

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact - Samarth Saxena</title>
        <meta name="description" content="Get in touch with Samarth Saxena" />
      </Head>

      <div className="min-h-screen bg-background dark:bg-[#191919] text-foreground">
        <main className="container py-12 px-20">
          <div className="pt-20 pb-12">
            <h1 className="text-4xl font-bold mb-12">Contact</h1>
            
            <div className="space-y-6 text-lg">
              <div className="flex items-center gap-3">
                <MailIcon className="h-6 w-6 text-email" />
                <span className="font-medium">Email:</span>
                <Link 
                  href="mailto:samarthsaxena1672003@gmail.com" 
                  className="hover:underline"
                >
                  samarthsaxena1672003@gmail.com
                </Link>
              </div>
              
              <div className="flex items-center gap-3">
                <TwitterIcon className="h-6 w-6 fill-twitter stroke-twitter" />
                <span className="font-medium">Twitter:</span>
                <Link 
                  href="https://twitter.com/awesamarth_" 
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:underline"
                >
                  @awesamarth_
                </Link>
              </div>
              
              <div className="flex items-center gap-3">
                <svg
                  className="h-6 w-6 fill-farcaster"
                  aria-hidden="true"
                  viewBox="0 0 225 225"
                >
                  <rect width="225" height="225" rx="50" fill="none"></rect>
                  <path d="M58 35H167V190H151V119H150.843C149.075 99.3773 132.583 84 112.5 84C92.4169 84 75.9253 99.3773 74.157 119H74V190H58V35Z"></path>
                  <path d="M29 57L35.5 79H41V168C38.2386 168 36 170.239 36 173V179H35C32.2386 179 30 181.239 30 184V190H86V184C86 181.239 83.7614 179 81 179H80V173C80 170.239 77.7614 168 75 168H69V57H29Z"></path>
                  <path d="M152 168C149.239 168 147 170.239 147 173V179H146C143.239 179 141 181.239 141 184V190H197V184C197 181.239 194.761 179 192 179H191V173C191 170.239 188.761 168 186 168V79H191.5L198 57H158V168H152Z"></path>
                </svg>
                <span className="font-medium">Farcaster:</span>
                <Link 
                  href="https://warpcast.com/awesamarth" 
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:underline"
                >
                  @awesamarth
                </Link>
              </div>
              
              <div className="flex items-center gap-3">
                <GithubIcon className="h-6 w-6" />
                <span className="font-medium">Github:</span>
                <Link 
                  href="https://github.com/awesamarth" 
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:underline"
                >
                  @awesamarth
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}