// app/font-test/page.tsx
'use client'

import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
});

export default function FontTest() {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-8 p-8">
      <h1 className="text-2xl font-bold">Default Font Heading</h1>
      
      <p className="max-w-lg text-center">
        This text is using the default system font to provide a comparison for the tests below.
      </p>
      
      <div className={pressStart2P.className}>
        <h2 className="text-xl text-primary mb-4">
          This is a test to see if Press Start 2P is working
        </h2>
        <p className="text-sm">
          This text should be displayed in the Press Start 2P font
        </p>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Testing with inline style:</h3>
        <p style={{ fontFamily: "'Press Start 2P', cursive" }} className="text-sm">
          This text uses Press Start 2P via inline style
        </p>
      </div>
    </div>
  );
}