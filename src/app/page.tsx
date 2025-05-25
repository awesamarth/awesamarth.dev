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
import { ABI, LOCAL_DOOMGOAT_ADDRESS, LOCAL_GOAT_ADDRESS, MEGA_DOOMGOAT_ADDRESS, MEGA_GOAT_ADDRESS } from "@/constants";
import { foundry } from "viem/chains";



export default function Home() {
  type GithubCommit = {
    repo: string;
    message: string;
    date: string;
    url: string; // Added URL field for the repo link
  };

  type Cast = {
    text: string;
    timestamp: number;
    url: string;
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
  const [latestCast, setLatestCast] = useState<Cast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [alreadyMinted, setAlreadyMinted] = useState(false);

  const { address } = useAccount()
  const specificRepos = ["blaze-arcade", "mega-cli", "croc-ai", "gambit"];
  //removed morhpide (at least for now)
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
      const response = await fetch('https://api.github.com/users/awesamarth/repos?per_page=100');
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = await response.json();

      // Filter to only include the specific repositories we want
      specificRepos.forEach(repoName => {
        const repo = data.find((r: any) => r.name === repoName);
        if (repo) {
          fetchedRepos.push({
            name: repo.name,
            description: repo.description || 'No description available',
            language: repo.language || 'Unknown',
            updated_at: new Date(repo.updated_at).toLocaleDateString(),
            html_url: repo.html_url,
            language_color: getLanguageColor(repo.language)
          });
        }
      });

      // If any specified repos weren't found, we could add fallbacks
      if (fetchedRepos.length < specificRepos.length) {
        console.warn("Some specified repositories were not found");
      }

      setRepositories(fetchedRepos);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      // Set fallback repos with the exact names you want
      setRepositories([
        {
          name: "mega-cli",
          description: "A sick CLI tool for MegaETH users and devs",
          language: "TypeScript",
          updated_at: "29 Mar 2025",
          html_url: "https://github.com/awesamarth/mega-cli",
          language_color: "#3178c6"
        },
        {
          name: "gambit",
          description: "Chess on the blockchain",
          language: "TypeScript",
          updated_at: "17 Mar 2025",
          html_url: "https://github.com/awesamarth/gambit",
          language_color: "#3178c6"
        },

        {
          name: "croc-ai",
          description: "Your friendly neighbourhood browser assistant",
          language: "TypeScript",
          updated_at: "1 Feb 2025",
          html_url: "https://github.com/awesamarth/croc-ai",
          language_color: "#3178c6"
        },
        {
          name: "morphide",
          description: "AI powered online IDE built with a special focus on Morph",
          language: "TypeScript",
          updated_at: "27 Apr 2024",
          html_url: "https://github.com/awesamarth/morphide",
          language_color: "#3178c6"
        }
      ]);
    }
  }

  function formatFarcasterTimestamp(timestamp: number): string {
    // Farcaster timestamps count seconds from Jan 1, 2021 00:00:00 UTC
    const farcasterEpochStart = new Date('2021-01-01T00:00:00Z').getTime();
    const date = new Date(farcasterEpochStart + (timestamp * 1000));
    return date.toLocaleDateString();
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
        // Using GitHub API to fetch the latest commit
        const response = await fetch('https://api.github.com/users/awesamarth/events/public');
        const data = await response.json();

        // Define more specific type for GitHub events
        type GithubEvent = {
          type: string;
          payload: any;
          repo: {
            name: string;
          };
          created_at: string;
        };

        // Find the first push event or create event
        const relevantEvent = data.find((event: GithubEvent) =>
          event.type === 'PushEvent' ||
          (event.type === 'CreateEvent' && event.payload.ref_type === 'repository')
        );

        if (relevantEvent) {
          if (relevantEvent.type === 'PushEvent') {
            // Handle Push Event
            const commit = relevantEvent.payload.commits[0];
            const repoName = relevantEvent.repo.name.split('/')[1];
            const repoFullName = relevantEvent.repo.name;

            setLatestCommit({
              repo: repoName,
              message: commit.message,
              date: new Date(relevantEvent.created_at).toLocaleDateString(),
              url: `https://github.com/${repoFullName}/commit/${commit.sha}`
            });
          } else if (relevantEvent.type === 'CreateEvent') {
            // Handle Create Event
            const repoName = relevantEvent.repo.name.split('/')[1];
            const repoFullName = relevantEvent.repo.name;

            setLatestCommit({
              repo: repoName,
              message: `Created new repository`,
              date: new Date(relevantEvent.created_at).toLocaleDateString(),
              url: `https://github.com/${repoFullName}`
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
async function fetchLatestCast() {
  try {
    const response = await fetch('/api/farcaster');
    const data = await response.json();

    if (!data.messages || data.messages.length === 0) {
      throw new Error('No casts found');
    }

    const castData = data.messages[0].data;
    const castHash = data.messages[0].hash;

    setLatestCast({
      text: castData.castAddBody.text,
      timestamp: castData.timestamp,
      url: `https://farcaster.xyz/awesamarth/${castHash}`
    });
  } catch (error) {
    console.log('Farcaster Hub endpoint down. Displaying placeholder cast instead', error);
    setLatestCast({
      text: "Check out my latest projects and updates on my portfolio site!",
      timestamp: 0,
      url: "https://farcaster.xyz/awesamarth"
    });
  }
}



    Promise.all([fetchGithubCommit(), fetchLatestCast(), fetchRepositories()])
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
        <main className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 md:px-20">
          {/* Hero Section */}
          <div className="flex flex-col-reverse md:flex-row items-center justify-between pt-24 pb-2 gap-8">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-bold mb-4 pb-3 border-b-2">
                Hey, I'm Samarth!
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mb-4">
                I am a 21 year old Full-Stack dev, Smart Contract dev and DevRel from India. I am extremely curious and on a
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

          {/* Latest Commit and Tweet Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-12">
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
                    <h3 className="font-medium">{latestCommit?.repo || "Repository"}</h3>
                    <p className="text-muted-foreground">{latestCommit?.message || "Commit message"}</p>
                  </Link>
                  <p className="text-sm text-muted-foreground mt-4">on {latestCommit?.date || "recent date"}</p>
                </>
              )}
            </div>

            <div className="rounded-lg border p-6 bg-card">
              <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
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
                Latest Cast
              </h2>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <Link
                    href={latestCast?.url || "https://farcaster.xyz/awesamarth"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline"
                  >
                    <p className="text-muted-foreground">
                      {latestCast?.text || "Check out my latest projects and updates on my portfolio site!"}
                    </p>
                  </Link>
                  <p className="text-sm text-muted-foreground mt-4">
                    {latestCast?.timestamp ? `on ${formatFarcasterTimestamp(latestCast.timestamp)}` : "recently"}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Open Source Projects Section */}
          <div className="mb-12 mt-20">
            <h2 className="text-2xl font-bold mb-6">Open Source Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading ? (
                // Loading state
                Array(4).fill(0).map((_, i) => (
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