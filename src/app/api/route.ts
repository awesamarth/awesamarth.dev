import { NextRequest } from "next/server";
import { createWalletClient, custom, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, megaethTestnet } from "viem/chains";
import { LOCAL_GOAT_ADDRESS, LOCAL_DOOMGOAT_ADDRESS, ABI, MEGA_DOOMGOAT_ADDRESS, MEGA_GOAT_ADDRESS } from "@/constants";

const DEV_ACCOUNT = privateKeyToAccount(process.env.DEV_PRIVATE_KEY as `0x${string}`)
const LOCAL_ACCOUNT = privateKeyToAccount(process.env.LOCAL_PRIVATE_KEY as `0x${string}`)

const walletClient = createWalletClient({
    chain: megaethTestnet,
    transport: http(),
    account:  DEV_ACCOUNT
  }).extend(publicActions)

export async function POST(req:NextRequest) {

    try {
      // Parse the JSON body from the request
      const {address, theme} = await req.json();
      
      // Log the received data
      console.log('Received address: ', address);
      console.log("Received theme: ", theme)

      const nextTokenId = await walletClient.readContract({
        address: theme==="doom"?MEGA_DOOMGOAT_ADDRESS:MEGA_GOAT_ADDRESS,
        abi: ABI,
        functionName: '_nextTokenId'
    });

    console.log(Number(nextTokenId))
    

      const { request } = await walletClient.simulateContract({
        address: theme==="doom"?MEGA_DOOMGOAT_ADDRESS:MEGA_GOAT_ADDRESS,
        abi: ABI,
        functionName: 'mint',
        args: [address]
      })

      const hash = await walletClient.writeContract(request);
      
      return Response.json({tokenId: Number(nextTokenId), txHash: hash});
      
    } catch (error){
        console.error('Error in API route:', error);
        
        //@ts-ignore
        if (error.message && error.message.includes('AlreadyMinted')) {
          return Response.json(
            { error: 'You have already minted an NFT' },
            { status: 400 }
          );
        }
        
        return Response.json(
          { error: 'Failed to process request' },
          { status: 500 }
        );
      }

      
  }