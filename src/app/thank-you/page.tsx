// app/thankyou/page.tsx or pages/thankyou.tsx
'use client'

import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { MEGA_DOOMGOAT_ADDRESS, MEGA_GOAT_ADDRESS } from '@/constants';

export default function ThankYou() {
    const searchParams = useSearchParams();
    const tokenId = searchParams.get('tokenId');
    const txHash = searchParams.get('txHash');
    const urlTheme = searchParams.get('theme');
    const { theme } = useTheme();

    // Use the theme from URL parameter if available, otherwise use the current theme
    const displayTheme = urlTheme || theme;
    const isDoom = displayTheme === 'doom';

    // Redirect to home if no tokenId or txHash
    useEffect(() => {
        if (!tokenId || !txHash) {
            window.location.href = '/';
        }
    }, [tokenId, txHash]);

    if (!tokenId || !txHash) {
        return null;
    }

    function getRaribleUrl(){
        if (isDoom){
            return `https://testnet.rarible.fun/items/megaethtestnet/${MEGA_DOOMGOAT_ADDRESS}:${tokenId}`
        }

        else{
            return `https://testnet.rarible.fun/items/megaethtestnet/${MEGA_GOAT_ADDRESS}:${tokenId}`
        }
    }

    return (
        <div className="min-h-screen bg-background dark:bg-[#191919] text-foreground">
            <main className="container py-12 px-20">
                <div className="pt-20 pb-12 flex flex-col items-center">
                    <div className="bg-card border rounded-lg p-6 max-w-lg w-full">
                        <h1 className="text-3xl font-bold mb-6 text-center">
                            Thank You for Visiting!
                            {isDoom && (
                                <div className="mt-2 text-primary">RIP AND TEAR!</div>
                            )}
                        </h1>

                        <div className="relative w-full h-64 mb-6 rounded-md overflow-hidden border group">
                            <Link href={getRaribleUrl()}>
                                <div className="relative w-full h-full">
                                    <Image
                                        src={isDoom ? '/doom-nft.jpg' : '/regular-nft.jpg'}
                                        alt="Your NFT"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                    {/* Overlay with View on Rarible text */}
                                    <div className={`absolute inset-0 ${isDoom?"bg-black/70":"bg-black/80"} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                                        <div className="flex flex-col items-center space-y-2">
                                            <span className="text-pink-500 font-bold text-lg ">View on Rarible</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-lg"><span className="font-medium">Token ID:</span> {tokenId}</p>
                            <p className="text-lg">
                                <span className="font-medium">Transaction:</span>{' '}
                                <Link
                                    href={`https://www.megaexplorer.xyz/tx/${txHash}`}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-primary hover:underline"
                                >
                                    View on MegaExplorer
                                </Link>
                            </p>
                        </div>

                        <p className="text-muted-foreground text-center ">
                            This NFT on MegaETH testnet has been minted to your wallet as a token of your visit.
                            {isDoom && " You discovered the DOOM easter egg - this is a special edition NFT."} Enjoy! 
                        </p>

                        <div className="flex justify-center mt-8">
                            <Link href="/" className='hover:cursor-pointer'>
                                <button className="hover:cursor-pointer py-2 px-6 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                                    Return Home
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}