// pages/writings.tsx or app/writings/page.tsx
'use client'
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Head from "next/head";
import Image from "next/image";

type BlogPost = {
    title: string;
    subtitle: string | null;
    brief: string;
    url: string;
    coverImage: {
        url: string;
    };
};

export default function Writings() {
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchBlogPosts() {
            try {

                const query = `
          query Publication {
            publication(host: "awesamarth.hashnode.dev") {
              isTeam
              title
              posts(first: 10) {
                edges {
                  node {
                    title
                    subtitle
                    brief
                    url
                    coverImage {
                      url
                    }
                  }
                }
              }
            }
          }
        `;

                const response = await fetch('https://gql.hashnode.com', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query }),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch blog posts');
                }

                const data = await response.json();
                const posts = data.data.publication.posts.edges.map((edge: any) => edge.node);

                // Filter posts that have cover images, then get first 5
                const postsWithImages = posts.filter((post: any) => post.coverImage?.url);
                setBlogPosts(postsWithImages.slice(0, 5));
            } catch (error) {
                console.error('Error fetching blog posts:', error);
                // Fallback data if API fails
                setBlogPosts([
                    {
                        title: "BONUS: Cheatcodes in Foundry",
                        subtitle: "A guide that covers some of the many cheatcodes available in Foundry",
                        brief: "Introduction\nFor testing complex smart contracts, simply examining their outputs may not be enough. To manipulate the state of the blockchain, as well as test for specific reverts and events, Foundry is shipped with a set of cheatcodes. In this guide...",
                        url: "https://awesamarth.hashnode.dev/bonus-cheatcodes-in-foundry",
                        coverImage: {
                            url: "https://cdn.hashnode.com/res/hashnode/image/upload/v1743108960476/a766fad9-8aa9-4183-bbad-8ac48d3622ab.png"
                        }
                    },
                    {
                        title: "How to test smart contracts using Foundry",
                        subtitle: "Learn how you can test your smart contracts in Foundry",
                        brief: "Introduction\nIf you've been following this series, you know how can write, compile, deploy and verify smart contracts using Foundry. However, it is crucial for all smart contract developers to know how to test their contracts before deploying them on...",
                        url: "https://awesamarth.hashnode.dev/how-to-test-smart-contracts-using-foundry",
                        coverImage: {
                            url: "https://cdn.hashnode.com/res/hashnode/image/upload/v1743108867582/6270c652-82fd-4942-b898-6180a3735a89.png"
                        }
                    },
                    {
                        title: "How to verify smart contracts using Foundry",
                        subtitle: "Learn how you can verify your contracts using Etherscan's API",
                        brief: "Introduction\nBlockchain technology is built on the fundamental principle of transparency, where every transaction is visible and verifiable. We extend the same principle to smart contracts. When they are deployed on the Ethereum network, their byteco...",
                        url: "https://awesamarth.hashnode.dev/how-to-verify-smart-contracts-using-foundry",
                        coverImage: {
                            url: "https://cdn.hashnode.com/res/hashnode/image/upload/v1743108846226/e70be7db-f80b-4f91-acd9-461395a02b44.png"
                        }
                    },
                    {
                        title: "Mainnet Forking in Foundry",
                        subtitle: "Learn how you can fork Ethereum Mainnet and other live networks in Foundry",
                        brief: "Introduction\nWhen developing smart contracts, we often need to interact with contracts that have already been deployed. It would not be a smart decision to deploy the contract and test it on Mainnet using real ETH. But, thankfully for us, there is a ...",
                        url: "https://awesamarth.hashnode.dev/mainnet-forking-in-foundry",
                        coverImage: {
                            url: "https://cdn.hashnode.com/res/hashnode/image/upload/v1743108604680/2d81ba4e-d523-444b-9165-75e99753e5d7.png"
                        }
                    },
                    {
                        title: "How to deploy smart contracts using Foundry",
                        subtitle: "Learn how you can deploy your contracts both on-chain and locally",
                        brief: "Introduction\nIf you've been following this series so far, you already know how to write and compile smart contracts in Foundry. You also know how to use keystores to safely store and use your private keys. Now it is time to learn how you can deploy s...",
                        url: "https://awesamarth.hashnode.dev/how-to-deploy-smart-contracts-using-foundry",
                        coverImage: {
                            url: "https://cdn.hashnode.com/res/hashnode/image/upload/v1743108567128/f183bf61-abbc-4309-8373-7ac24a10bdc4.png"
                        }
                    }
                ]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchBlogPosts();
    }, []);

    // Function to truncate the brief text
    const truncateBrief = (text: string, maxLength: number = 150) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    return (
        <>
            <Head>
                <title>Writings - Samarth Saxena</title>
                <meta name="description" content="Articles and blog posts by Samarth Saxena" />
            </Head>

            <div className="min-h-screen bg-background dark:bg-[#191919] text-foreground">
                <main className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 md:px-20">
                    <div className="pt-20 pb-6">
                        <h1 className="text-4xl font-bold mb-4">Writings</h1>
                        <p className="text-lg text-muted-foreground max-w-3xl">
                            A collection of articles and tutorials, mostly about blockchain protocols and tools.
                        </p>
                    </div>


                    {/* Blog Posts Grid */}
                    <div className="my-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isLoading ? (
                            // Loading skeletons
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="rounded-lg border p-6 bg-card animate-pulse">
                                    <div className="h-48 bg-muted rounded-lg mb-4"></div>
                                    <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
                                    <div className="h-4 bg-muted rounded w-2/3 mb-3"></div>
                                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                                    <div className="h-4 bg-muted rounded w-3/4"></div>
                                </div>
                            ))
                        ) : blogPosts.length > 0 ? (
                            // Display actual blog posts
                            blogPosts.map((post, index) => (
                                <Link
                                    key={index}
                                    href={post.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="rounded-lg border p-6 bg-card hover:border-primary transition-colors flex flex-col h-full"
                                >
                                    <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden mb-4">
                                        <Image
                                            src={post.coverImage.url}
                                            alt={post.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                        />
                                    </div>
                                    <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                                    {post.subtitle && (
                                        <p className="text-muted-foreground mb-2 text-sm">{post.subtitle}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground mt-auto">
                                        {truncateBrief(post.brief.replace(/\n/g, ' '), 120)}
                                    </p>
                                </Link>
                            ))
                        ) : (
                            // Fallback if no blog posts found
                            <div className="col-span-2 text-center p-6">
                                <p>No articles found. Check back later!</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center mt-8">
                        <Link
                            href="https://awesamarth.hashnode.dev/"
                            className="hover:cursor-pointer"
                            target="_blank"
                            rel="noreferrer noopener"
                        >
                            <Button variant="outline" className="flex items-center gap-2 mt-5 hover:cursor-pointer">
                                View All Articles <span className="transform font-bold text-lg rotate-45">↑</span>
                            </Button>
                        </Link>
                    </div>
                </main>
            </div>
        </>
    );
}