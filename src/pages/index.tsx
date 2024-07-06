import Image from "next/image";
import { Inter } from "next/font/google";
import { GeoMap } from "@/GeoMap";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-center p-8 ${inter.className}`}
    >
      <h1 className="text-4xl">CBRLE</h1>
      <h4>Guess the suburb!</h4>
      <GeoMap />
    </main>
  );
}
