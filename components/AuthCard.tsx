/* eslint-disable @next/next/no-img-element -- static SVG design assets */
import type { ReactNode } from "react";
import Link from "next/link";

/** The Figma sign-in / sign-up popup: a card with a blue title band and a close button. */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="px-3 py-6 sm:py-6">
      <div className="sk sk-modal relative mx-auto max-w-[707px] overflow-hidden rounded-[48px] pb-8 sm:rounded-[69px]">
        <div className="sk sk-bar relative flex h-[76px] items-center justify-center gap-4 sm:h-[99px] sm:gap-8">
          <img src="/figma/modal-star-left.svg" alt="" width={51} height={46} className="w-9 sm:w-[52px]" />
          <h1 className="text-[44px] leading-none text-canvas sm:text-[67px]">{title}</h1>
          <img src="/figma/modal-star-right.svg" alt="" width={51} height={46} className="w-9 sm:w-[52px]" />
          <Link
            href="/"
            aria-label="Close"
            className="absolute right-3 top-1/2 flex size-14 -translate-y-1/2 items-center justify-center rounded-full sm:right-[29px] sm:size-[76px]"
          >
            <img src="/figma/modal-close.svg" alt="" width={84} height={84} className="absolute inset-0 size-full" />
            {/* A lowercase "x" is shorter than capitals, so it sits slightly low; lift it to centre. */}
            <span aria-hidden className="relative -translate-y-[0.06em] text-[30px] leading-none text-canvas sm:text-[41px]">
              x
            </span>
          </Link>
        </div>

        <div className="px-6 pt-4 text-center sm:px-[35px]">
          <div className="text-heading">{subtitle}</div>
          <div className="mt-3 flex justify-center gap-[15px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <img key={i} src="/figma/modal-star-small.svg" alt="" width={28} height={27} className="w-6 sm:w-7" />
            ))}
          </div>
          <div className="mt-4 text-left sm:px-[34px]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function OrDivider() {
  return (
    <p className="my-5 text-center text-[32px] text-heading sm:text-[39px]" aria-hidden>
      or
    </p>
  );
}

export function AuthSwitchLink({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <p className="mt-4 text-center text-lg text-muted sm:text-[22px]">
      {prompt}{" "}
      <Link href={href} className="text-link underline-offset-2 hover:underline">
        {label}
      </Link>
    </p>
  );
}
