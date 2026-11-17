/* eslint-disable @next/next/no-img-element -- static SVG design assets */
import Link from "next/link";
import HowItWorks from "@/components/HowItWorks";

const button =
  "sk flex h-14 min-w-32 items-center justify-center rounded-[20px] px-5 text-[30px] text-canvas lg:h-[76px] lg:min-w-[154px] lg:text-[41px]";

export default function Home() {
  return (
    <div className="flex flex-col items-center px-4 pb-16 pt-10 sm:pt-16 lg:pt-24">
      <h1 className="relative w-full max-w-[594px]">
        {/* The arched title is text-on-path in Figma, which can't be exported; rebuilt as SVG text. */}
        <svg viewBox="0 0 594 250" role="img" aria-label="Consider: what you're buying" className="w-full overflow-visible">
          <defs>
            <path id="logo-arc-top" d="M 70 160 Q 297 70 524 160" />
            <path id="logo-arc-bottom" d="M 70 226 Q 297 140 524 226" />
          </defs>
          <g fill="var(--color-btn)" stroke="var(--color-btn-edge)" strokeWidth="1.5" filter="url(#sketch)">
            <text fontSize="92" textAnchor="middle">
              <textPath href="#logo-arc-top" startOffset="50%">
                Consider
              </textPath>
            </text>
            <text fontSize="46" textAnchor="middle">
              <textPath href="#logo-arc-bottom" startOffset="50%">
                what you’re buying
              </textPath>
            </text>
          </g>
        </svg>
        <img
          src="/figma/home-star-left.svg"
          alt=""
          width={51}
          height={46}
          className="motion-loop absolute left-[10.5%] top-[47%] w-[8.7%] animate-[star-wiggle_2s_linear_infinite]"
        />
        {/* Mirrored wrapper: the right star swings opposite to the left one, as in Figma. */}
        <span className="absolute right-[9%] top-[43%] w-[8.7%] -scale-x-100">
          <img
            src="/figma/home-star-right.svg"
            alt=""
            width={51}
            height={46}
            className="motion-loop block w-full animate-[star-wiggle_2s_linear_infinite]"
          />
        </span>
      </h1>

      <img
        src="/figma/home-cart.svg"
        alt=""
        width={235}
        height={191}
        className="motion-loop mt-4 w-[180px] animate-[cart-roll_2s_infinite] sm:w-[222px]"
      />

      <div className="mt-12 flex items-center gap-10 sm:gap-[86px]">
        <Link href="/sign-up" className={`${button} sk-btn`}>
          Sign up
        </Link>
        <Link href="/sign-in" className={`${button} sk-btn-dark`}>
          Sign in
        </Link>
      </div>

      <HowItWorks />
    </div>
  );
}
