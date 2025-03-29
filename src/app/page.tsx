'use client'
import Head from "next/head";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { GithubIcon, TwitterIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLanguageColor } from "@/utils";

export default function Home() {
  type GithubCommit = {
    repo: string;
    message: string;
    date: string;
    url: string; // Added URL field for the repo link
  };

  // Twitter API response types (simplified)
  type Tweet = {
    text: string;
    created_at: string;
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
  const [latestTweet, setLatestTweet] = useState<Tweet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  const specificRepos = ["mega-cli", "croc-ai", "gambit", "morphide"];

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

    // Note: Directly fetching from Twitter API requires authentication
    // This would normally be done through a backend API
    // For now, I'll use a placeholder/mock
    function fetchLatestTweet() {
      // In a real implementation, this would make an API call to your backend
      // which would then use the Twitter API with proper authentication

      // Mocked data (in production, replace with actual API call)
      setTimeout(() => {
        setLatestTweet({
          text: "Check out my latest projects and updates on my portfolio site!",
          created_at: new Date().toLocaleDateString()
        });
      }, 500);
    }

    Promise.all([fetchGithubCommit(), fetchLatestTweet(), fetchRepositories()])
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

        <main className="container py-12 px-20">
          {/* Hero Section */}
          <div className="flex flex-col-reverse md:flex-row items-center justify-between pt-24 pb-2 gap-8">
            <div>
              <h1 className="text-4xl font-bold mb-4 pb-3 border-b-2">
                Hey, I'm Samarth!
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mb-4">
                I'm a 21 year old Full-Stack dev, Smart Contract dev and DevRel from India. I'm extremely curious and on a
                pursuit of knowledge. I believe that being sincere is much important than being serious.
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
                <TwitterIcon className="fill-twitter stroke-twitter" /> Latest Tweet
              </h2>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <Link
                    href={`https://twitter.com/awesamarth_`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline"
                  >
                    <p className="text-muted-foreground">
                      {latestTweet?.text || "Check out my latest projects and updates on my portfolio site!"}
                    </p>
                  </Link>
                  <p className="text-sm text-muted-foreground mt-4">{latestTweet?.created_at ? `on ${latestTweet.created_at}` : "recently"}</p>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: repo.language_color }}
                        ></span>
                        <span>{repo.language}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">Updated on {repo.updated_at}</span>
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
            <h3 className="text-xl mb-6">Grab a special NFT as a souvenir of your visit. Gas is on me!</h3>


            <div className="flex justify-end mt-4">
              <Link href="https://github.com/awesamarth?tab=repositories" target="_blank" rel="noreferrer noopener">
                <Button variant="outline" className="flex hover:cursor-pointer items-center gap-2">
                  View All <span className="transform rotate-45">↑</span>
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}