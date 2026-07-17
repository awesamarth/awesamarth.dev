'use client'

import Head from "next/head";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLanguageColor } from "@/utils";
import { useAccount, useReadContract } from 'wagmi'
import { useTheme } from 'next-themes';
import { useRouter } from "next/navigation"
import { ABI, MEGA_DOOMGOAT_ADDRESS, MEGA_GOAT_ADDRESS } from "@/constants";



export default function Home() {
  type GithubCommit = {
    repo: string;
    message: string;
    date: string;
    url: string; // Added URL field for the repo link
  };

  type Repository = {
    name: string;
    description: string;
    language: string;
    updated_at: string;
    html_url: string;
    language_color?: string; // We'll add this manually based on language
  };

  const [latestCommit, setLatestCommit] = useState<GithubCommit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [alreadyMinted, setAlreadyMinted] = useState(false);

  const { address } = useAccount()
  const featuredRepos = [
    {
      name: "agentis",
      description: "Complete financial infrastructure for AI agents on Solana",
    },
    {
      name: "ronin",
      description: "Agentic solutions engineer for protocol teams and enterprises",
    },
    {
      name: "watchdog",
      description: "Local operator control plane for agentic loops and subagents",
    },
    {
      name: "hazmat",
      description: "Local exposure scanner, reporter, and scrubber for AI coding-agent transcripts",
    },
    {
      name: "croc-ai",
      description: "Your friendly neighbourhood browser assistant",
    },
    {
      name: "mega-cli",
      description: "A CLI toolkit for MegaETH developers and users",
    },
  ];
  const router = useRouter()

  const { theme } = useTheme();
  const isDoomActive = theme === 'doom';

  const initialAlreaadyMinted = useReadContract({
    abi: ABI,
    address: theme === "doom" ? MEGA_DOOMGOAT_ADDRESS : MEGA_GOAT_ADDRESS,
    functionName: 'hasMinted',
    args: [address]
  })


  useEffect(() => {

    if (initialAlreaadyMinted?.data === true) {
      setAlreadyMinted(true);
    }
    else {
      setAlreadyMinted(false)
    }
  }, [initialAlreaadyMinted?.data, theme]);


  async function fetchRepositories() {
    try {
      let fetchedRepos: Repository[] = [];

      // Fetch all repositories to filter for the specific ones
      const response = await fetch('https://api.github.com/users/awesamarth/repos?per_page=100&sort=updated&direction=desc');
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = await response.json();

      // Filter to only include the specific repositories we want
      featuredRepos.forEach(featuredRepo => {
        const repo = data.find((r: any) => r.name === featuredRepo.name);
        if (repo) {
          fetchedRepos.push({
            name: repo.name,
            description: featuredRepo.description,
            language: repo.language || 'Unknown',
            updated_at: new Date(repo.updated_at).toLocaleDateString(),
            html_url: repo.html_url,
            language_color: getLanguageColor(repo.language)
          });
        }
      });

      if (fetchedRepos.length < featuredRepos.length) {
        console.warn("Some specified repositories were not found");
      }

      setRepositories(fetchedRepos);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      setRepositories(featuredRepos.map(repo => ({
        name: repo.name,
        description: repo.description,
        language: "TypeScript",
        updated_at: "Recently",
        html_url: `https://github.com/awesamarth/${repo.name}`,
        language_color: "#3178c6"
      })));
    }
  }



  const mintNFT = async () => {
    if (!address) return;

    setIsMinting(true);
    setMintError(null);
    setAlreadyMinted(false);

    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, theme }),
      });

      const data = await response.json();

      if (!response.ok) {

        // console.log("here's the error: ", data.error)
        // Check if it's the "already minted" error
        if (data.error && data.error.includes('already minted')) {
          // console.log("yes already minted")
          setAlreadyMinted(true);
          throw new Error('You have already minted an NFT!');
        }
        throw new Error(data.error || 'Failed to mint NFT');
      }

      // Success case - redirect to the thank you page with tokenId and txHash
      router.push(`/thank-you?tokenId=${data.tokenId}&txHash=${data.txHash}&theme=${theme}`);
      return data;
    } catch (error) {
      console.error('Error calling API:', error);
      //@ts-ignore
      setMintError(error.message);
      throw error;
    } finally {
      setIsMinting(false);
    }
  };



  useEffect(() => {
    async function fetchGithubCommit() {
      try {
        // Fetch events to find the most recent PushEvent
        const eventsResponse = await fetch('https://api.github.com/users/awesamarth/events/public');
        const events = await eventsResponse.json();

        type GithubEvent = {
          type: string;
          repo: {
            name: string;
          };
          created_at: string;
        };

        // Find the most recent PushEvent or CreateEvent (new repo creation)
        const relevantEvent = events.find((event: GithubEvent) => event.type === 'PushEvent' || event.type === 'CreateEvent');

        if (relevantEvent) {
          const repoFullName = relevantEvent.repo.name;
          const repoName = repoFullName.split('/')[1];

          // Fetch the latest commit from that repo
          const commitResponse = await fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=1`);
          const commitData = await commitResponse.json();

          if (commitData && commitData.length > 0) {
            const latestCommit = commitData[0];
            setLatestCommit({
              repo: repoName,
              message: latestCommit.commit.message,
              date: new Date(latestCommit.commit.author.date).toLocaleDateString(),
              url: latestCommit.html_url
            });
          }
        }
      } catch (error) {
        console.error('Error fetching GitHub data:', error);
        // Fallback data if API fails
        setLatestCommit({
          repo: 'github-repo',
          message: 'Recent commit message',
          date: 'Recent date',
          url: 'https://github.com/awesamarth'
        });
      }
    }



    Promise.all([fetchGithubCommit(), fetchRepositories()])
      .finally(() => setIsLoading(false));

  }, []);

  return (
    <>
      <Head>
        <title>Samarth Saxena- Portfolio</title>
        <meta name="description" content="Software Engineer Portfolio" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-background dark:bg-[#191919] text-foreground">
        <main className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 md:px-20 2xl:px-28">
          {/* Hero Section */}
          <div className="flex flex-col-reverse md:flex-row items-center justify-between pt-24 pb-2 gap-8">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-bold mb-4 pb-3 border-b-2">
                Hey, I'm Samarth!
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mb-4">
                I am a 23 year old Full-Stack dev, Smart Contract dev and DevRel from India. I am extremely curious and on a
                pursuit of knowledge. I believe that being sincere is much more important than being serious.
              </p>

              <p className="text-muted-foreground [&:not(:first-child)]:mt-6">
                Fun fact: I love DOOM. A lot.
                {typeof window !== 'undefined' && 'ontouchstart' in window === false && (
                  isDoomActive ? (
                    <span className="ml-1 font-bold text-primary">{" "}RIP AND TEAR!</span>
                  ) : (
                    <span className="ml-1">It is hidden somewhere on this site too, see if you can find it!</span>
                  )
                )}
              </p>
            </div>
          </div>

          {/* Latest Commit Section */}
          <div className="my-12">
            <div className="rounded-lg border p-6 bg-card">
              <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                <GithubIcon className="fill-current" /> Latest Public Commit
              </h2>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <Link
                    href={latestCommit?.url || "https://github.com/awesamarth"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline"
                  >
                    <h3 className="font-medium">{latestCommit?.repo || "github-repo"}</h3>
                    <p className="text-muted-foreground">{latestCommit?.message || "Recent commit message"}</p>
                  </Link>
                  <p className="text-sm text-muted-foreground mt-4">on {latestCommit?.date || "recent date"}</p>
                </>
              )}
            </div>

          </div>

          {/* Experience Section */}
          <section className="mb-12 mt-20">
            <h2 className="text-2xl font-bold mb-8">Experience</h2>

            <div className="space-y-0">
              <Link
                href="https://risechain.com"
                target="_blank"
                rel="noreferrer noopener"
                className="group grid cursor-pointer grid-cols-[5.5rem_1.25rem_1fr] gap-x-3 sm:grid-cols-[7rem_1.5rem_1fr] sm:gap-x-4"
              >
                <div className="pt-1 text-sm sm:text-base font-mono text-muted-foreground leading-6">
                  <div>Mar 2026</div>
                  <div>Oct 2025</div>
                </div>

                <div className="relative flex justify-center">
                  <span className="relative z-10 mt-2 h-2.5 w-2.5 rounded-full bg-muted-foreground transition-colors group-hover:bg-foreground" />
                  <span className="absolute top-5 bottom-0 border-l border-dashed border-muted-foreground/70" />
                </div>

                <div className="pb-10">
                  <div className="mb-3 flex items-center gap-3">
                    <Image
                      src="/rise-logo.png"
                      alt="RISE Chain logo"
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                    />
                    <h3 className="text-lg font-semibold">
                      RISE Chain <span className="mx-1 text-muted-foreground">•</span>{" "}
                      <span className="text-muted-foreground">Full-Stack Developer Relations Engineer</span>
                    </h3>
                  </div>
                  <p className="max-w-4xl text-muted-foreground">
                    Worked on the product team across developer tooling, docs, ecosystem projects, the RISE Shreds API for millisecond confirmations, and RISE Wallet, an EIP-7702-powered wallet offering.
                  </p>
                </div>
              </Link>

              <Link
                href="https://learnweb3.io"
                target="_blank"
                rel="noreferrer noopener"
                className="group grid cursor-pointer grid-cols-[5.5rem_1.25rem_1fr] gap-x-3 sm:grid-cols-[7rem_1.5rem_1fr] sm:gap-x-4"
              >
                <div className="pt-1 text-sm sm:text-base font-mono text-muted-foreground leading-6">
                  <div>Jan 2025</div>
                  <div>May 2023</div>
                </div>

                <div className="relative flex justify-center">
                  <span className="relative z-10 mt-2 h-2.5 w-2.5 rounded-full bg-muted-foreground transition-colors group-hover:bg-foreground" />
                  <span className="absolute top-0 bottom-6 border-l border-dashed border-muted-foreground/70" />
                </div>

                <div className="pb-2">
                  <div className="mb-3 flex items-center gap-3">
                    <Image
                      src="/learnweb3-logo.png"
                      alt="LearnWeb3 logo"
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                    />
                    <h3 className="text-lg font-semibold">
                      LearnWeb3 <span className="mx-1 text-muted-foreground">•</span>{" "}
                      <span className="text-muted-foreground">Full-Stack Engineer & Technical Content Creator</span>
                    </h3>
                  </div>
                  <p className="max-w-4xl text-muted-foreground">
                    Maintained the LearnWeb3 platform, wrote technical lessons, built educational projects, worked on the AI and Ethereum degrees, and contributed full-stack and smart-contract work to Nucleo Finance.
                  </p>
                </div>
              </Link>
            </div>
          </section>

          {/* Open Source Projects Section */}
          <div className="mb-12 mt-20">
            <h2 className="text-2xl font-bold mb-6">Open Source Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading ? (
                // Loading state
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="rounded-lg border p-6 bg-card animate-pulse">
                    <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-5/6 mb-4"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted"></div>
                        <div className="h-4 bg-muted rounded w-16"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-32"></div>
                    </div>
                  </div>
                ))
              ) : repositories.length > 0 ? (
                // Display actual repositories
                repositories.map((repo) => (
                  <Link
                    key={repo.name}
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-lg border p-6 bg-card hover:border-primary transition-colors"
                  >
                    <h3 className="text-xl font-semibold">{repo.name}</h3>
                    <p className="text-muted-foreground mb-4">{repo.description}</p>

                    {/* Modified footer layout for better mobile display */}
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: repo.language_color }}
                        ></span>
                        <span>{repo.language}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Updated on {repo.updated_at}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                // Fallback if no repositories found
                <div className="col-span-2 text-center p-6">
                  <p>No repositories found. Check back later!</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Link href="https://github.com/awesamarth?tab=repositories" target="_blank" rel="noreferrer noopener">
                <Button variant="outline" className="flex hover:cursor-pointer items-center gap-2">
                  View All <span className="transform rotate-45">↑</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Mints on me! */}
          <div className="mb-12 mt-20">
            <h2 className="text-2xl font-bold mb-3">Proof-of-Visit</h2>
            <h3 className="text-xl mb-6">Grab a special NFT on MegaETH testnet as a souvenir of your visit. Gas is on me!</h3>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {/* Web3Modal button for connecting */}
                <w3m-button />

                {/* Custom mint button that appears only when connected */}
                {address && (
                  <Button
                    className="hover:cursor-pointer py-2 px-6 font-semibold text-[17px] bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                    onClick={mintNFT}
                    disabled={isMinting || alreadyMinted}
                  >
                    {isMinting ? 'Minting...' : 'Mint NFT'}
                  </Button>
                )}
              </div>

              {/* Display error message if there is one */}
              {mintError && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md">
                  {mintError}
                </div>
              )}

              {/* Display already minted message */}
              {alreadyMinted && (
                <div className="py-4 px-4 bg-secondary/20 rounded-md">
                  You've already claimed your NFT! Thank you for visiting.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}