import type { Metadata } from "next";
import localFont from "next/font/local";
import Navigation from "@/components/Navigation";
import "./globals.css";

// Darumadrop One (SIL Open Font License), served locally so its vertical
// metrics can be corrected: the original reserves so much room above the
// letters that text sat ~0.13em low and never looked centred in buttons.
// These overrides centre the line box on the capital letters.
const darumadrop = localFont({
  src: "./fonts/DarumadropOne-latin.woff2",
  variable: "--font-darumadrop",
  weight: "400",
  display: "swap",
  declarations: [
    { prop: "ascent-override", value: "85%" },
    { prop: "descent-override", value: "25%" },
    { prop: "line-gap-override", value: "0%" },
  ],
});

export const metadata: Metadata = {
  title: "Consider",
  description: "Pause for 24 hours before you buy. Decide with a clear head.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${darumadrop.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Hand-drawn edge used by the `.sk` utilities (same noise as the Figma texture). */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter id="sketch" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="3" seed="3653" />
            <feDisplacementMap in="SourceGraphic" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <Navigation />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
