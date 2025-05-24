// pages/projects.tsx or app/projects/page.tsx (depending on your Next.js version)
'use client'
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GithubIcon } from "lucide-react";
import { getLanguageColor } from "@/utils";
import Head from "next/head";

type Repository = {
  name: string;
  description: string;
  language: string;
  updated_at: string;
  html_url: string;
  language_color?: string;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
};

export default function Projects() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRepositories() {
      try {
        // Fetch more repositories, sorted by most recently updated
        const response = await fetch('https://api.github.com/users/awesamarth/repos?sort=pushed&per_page=10');
        if (!response.ok) {
          throw new Error('Failed to fetch repositories');
        }

        const data = await response.json();

        // Filter out forked repositories
        const repos = data
          .filter((repo: any) => !repo.fork)
          .map((repo: any) => ({
            name: repo.name,
            description: repo.description || 'No description available',
            language: repo.language || 'Unknown',
            updated_at: new Date(repo.updated_at).toLocaleDateString(),
            html_url: repo.html_url,
            language_color: getLanguageColor(repo.language),
            topics: repo.topics || [],
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count
          }));

        setRepositories(repos);
      } catch (error) {
        console.error('Error fetching repositories:', error);
        // Set some fallback repos if needed
        setRepositories([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRepositories();
  }, []);

  return (
    <>
      <Head>
        <title>Projects - Samarth Saxena</title>
        <meta name="description" content="Open source projects and contributions by Samarth Saxena" />
      </Head>

      <div className="min-h-screen bg-background dark:bg-[#191919] text-foreground">
        <main className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 md:px-20">
          <div className="pt-20 pb-6">
            <h1 className="text-4xl font-bold mb-4">Projects</h1>
            <p className="text-lg text-muted-foreground max-w-3xl">
              A list of my open source projects and contributions spanning across websites, dApps, and browser extensions among others.
            </p>
          </div>

          {/* Projects Grid */}
          <div className="my-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
              // Loading skeletons
              Array(9).fill(0).map((_, i) => (
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
              // Update the repository cards in the projects page
              repositories.map((repo) => (
                <Link
                  key={repo.name}
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-lg border p-6 bg-card hover:border-primary transition-colors"
                >
                  <h3 className="text-xl font-semibold">{repo.name}</h3>
                  <p className="text-muted-foreground mb-4 min-h-[3rem]">{repo.description}</p>

                  {/* Topics/Tags */}
                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {repo.topics.slice(0, 3).map(topic => (
                        <span key={topic} className="px-2 py-1 text-xs bg-secondary rounded-full">
                          {topic}
                        </span>
                      ))}
                      {repo.topics.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-secondary rounded-full">
                          +{repo.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

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
                      {repo.stargazers_count > 0 && `★ ${repo.stargazers_count}`}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              // Fallback if no repositories found
              <div className="col-span-full text-center p-6">
                <p>No repositories found. Check back later!</p>
              </div>
            )}
          </div>
          <div className="flex justify-center mt-8">
            <Link href="https://github.com/awesamarth?tab=repositories" className="hover:cursor-pointer" target="_blank" rel="noreferrer noopener">
              <Button variant="outline" className="flex items-center gap-2 hover:cursor-pointer">
                View All Repositories <span className="transform font-bold text-lg rotate-45">↑</span>
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}