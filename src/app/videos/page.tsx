// pages/videos.tsx or app/videos/page.tsx
'use client'
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Head from "next/head";

type Video = {
    id: string;
    title: string;
    description: string;
};

export default function Videos() {
    // These are the specific video IDs you want to display
    const specificVideos: Video[] = [

        {
            id: "sHdCdAUCF0o",
            title: "TEN Survival: Russian Roulette style game on TEN Testnet",
            description: "This video is a demo of TEN Survival- a Russian Roulette style game powered by TEN protocol's secure and private randomness"
        },

        {
            id: "ePOsRN4BsAI",
            title: "How to Build “Signatureless” dApp Experiences",
            description: "This video shows how you can use Privy embedded wallets to enable virtually signatureless transactions in your dApps."
        },

        {
            id: "BfpEpmIN2xA",
            title: "Realtime Endpoints for Superfast Ethereum L2s",
            description: "This video explains custom realtime rpc methods used by MegaETH, RISE and Abstract. "
        },

        {
            id: "0ktNilzUN40",
            title: "How to Generate your First Proof on Succinct Network",
            description: "This video is a dev tutorial showing you how you can generate your first proof on Succinct Network. Zero to Dev: Episode 1."
        },
        {
            id: "sTtdiDvfS34",
            title: "Succinct Network Explained in 3 Difficulty Levels",
            description: "This overedited and chaotic video explains Succinct Network in 3 difficulty levels- Noob, Pro and Trenchwarrior. Brainrot Breakdowns: Episode 2."
        },

        {
            id: "uLLzEAp9DL4",
            title: "Mega CLI: The Ultimate CLI Tool for MegaETH",
            description: "A free and open-source CLI tool for MegaETH devs and users with multiple different commands"
        },
        {
            id: "9yBODQDQsWQ",
            title: "EigenLayer Explained in 3 Difficulty Levels",
            description: "This overedited and chaotic video explains EigenLayer in 3 difficulty levels- Noob, Pro and Trenchwarrior. Brainrot Breakdowns: Episode 1."
        },
        {
            id: "kPai4Wv5oCE",
            title: "Croc AI: Your friendly neighbourhood browser assistant",
            description: "Croc AI is a sidebar-by-default extension that uses in-browser Gemini Nano to transform Chrome into an intelligent companion."
        },
        // {
        //     id: "P6sJeB_Ghbw",
        //     title: "MorphIDE: AI-powered online IDE built for Morph (Sepolia)",
        //     description: "MorphIDE (Morph + IDE) is an AI-powered online IDE that can generate smart contracts using AI and can also answer doubts about the Morph blockchain."
        // },
        {
            id: "BFkGr0LqSYc",
            title: "Gambit: Chess on the blockchain",
            description: "Gambit is a game which combines authentic and pure chess gameplay with crypto wagering facilities. There are 4 game modes: Ranked, Unranked, Arena and Private."
        },
        // {
        //     id: "Ehfui0_DGbg",
        //     title: "Can you be trusted with your own crypto? | Bull Market Battletest",
        //     description: "Bull Market Battletest is a browser-based game that interactively teaches people about security in the crypto world."
        // },

    ];

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head>
                <title>Videos - Samarth Saxena</title>
                <meta name="description" content="Video tutorials and content by Samarth Saxena" />
            </Head>
            <div className="min-h-screen bg-background dark:bg-[#191919] text-foreground">
                <main className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 md:px-20">
                    <div className="pt-20 pb-6">
                        <h1 className="text-4xl font-bold mb-4">Videos</h1>
                        <p className="text-lg text-muted-foreground max-w-3xl">
                            A selection of videos on my channel consisting of tutorials, explainers, project demos and more.
                        </p>
                    </div>

                    <div className="my-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isLoading ? (
                            // Loading skeletons
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="rounded-lg border p-6 bg-card animate-pulse">
                                    <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
                                    <div className="h-4 bg-muted rounded w-full mb-4"></div>
                                    <div className="pt-[56.25%] relative bg-muted rounded-lg"></div>
                                </div>
                            ))
                        ) : specificVideos.length > 0 ? (
                            // Display actual videos
                            specificVideos.map((video) => (
                                <div
                                    key={video.id}
                                    className="rounded-lg border p-6 bg-card"
                                >
                                    <h2 className="text-xl font-semibold mb-2">{video.title}</h2>
                                    <p className="text-sm text-muted-foreground mb-4">{video.description}</p>
                                    <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden">
                                        <iframe
                                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                                            src={`https://www.youtube.com/embed/${video.id}`}
                                            title={video.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Fallback if no videos found
                            <div className="col-span-2 text-center p-6">
                                <p>No videos found. Check back later!</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center mt-10">
                        <Link
                            href="https://youtube.com/@awesamarth"
                            className="hover:cursor-pointer"
                            target="_blank"
                            rel="noreferrer noopener"
                        >
                            <Button variant="outline" className="flex items-center gap-2 hover:cursor-pointer">
                                View All Videos <span className="transform font-bold text-lg rotate-45">↑</span>
                            </Button>
                        </Link>
                    </div>
                </main>
            </div>
        </>
    );
}