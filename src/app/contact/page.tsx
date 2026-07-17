'use client'

import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { GithubIcon, MailIcon } from "lucide-react";
import { useTheme } from "next-themes";

export default function Contact() {
  const { theme } = useTheme();

  return (
    <>
      <Head>
        <title>Contact - Samarth Saxena</title>
        <meta name="description" content="Get in touch with Samarth Saxena" />
      </Head>

      <div className="min-h-screen bg-background dark:bg-[#191919] text-foreground" suppressHydrationWarning>
        <main className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 md:px-20 2xl:px-28">
          <div className="pt-20 pb-12">
            <h1 className="text-4xl font-bold mb-12">Contact</h1>

            <div className="space-y-6 text-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <div className="flex items-center gap-3">
                  <MailIcon className="h-6 w-6 text-email" />
                  <span className="font-medium">Email:</span>
                </div>
                <Link
                  href="mailto:samarthsaxena1672003@gmail.com"
                  className="hover:underline break-words"
                >
                  samarthsaxena1672003@gmail.com
                </Link>
              </div>

              
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-6 w-6">
                    <Image
                      src="/telegram-logo.png"
                      alt="Telegram Logo"
                      fill
                      className="object-contain telegram-logo"
                    />
                  </div>
                  <span className="font-medium">Telegram:</span>
                </div>
                <Link
                  href="https://t.me/awesamarth"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:underline"
                >
                  @awesamarth
                </Link>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-6 w-6">
                    <Image
                      src="/xlogo.png"
                      alt="X Logo"
                      fill
                      className="object-contain x-logo"
                    />
                  </div>
                  <span className="font-medium">X (formerly Twitter):</span>
                </div>
                <Link
                  href="https://x.com/awesamarth_"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:underline"
                >
                  @awesamarth_
                </Link>
              </div>


              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <div className="flex items-center gap-3">
                  <GithubIcon className={`h-6 w-6 ${theme == "light" ? "fill-white stroke-github" : "fill-white stroke-white"}`} />
                  <span className="font-medium">Github:</span>
                </div>
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