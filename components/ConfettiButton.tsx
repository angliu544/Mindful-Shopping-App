/* eslint-disable @next/next/no-img-element -- static SVG design assets */
import type { ButtonHTMLAttributes, CSSProperties } from "react";

/** Duration of the Burst -> Fade sequence (see `confetti-burst` in globals.css). */
export const CONFETTI_MS = 1100;

// From the Figma component "Start the pause — star confetti": each star's
// position in the Ready state and its offset + rotation in Burst and Fade.
const STARS: { x: number; y: number; burst: [number, number, number]; fade: [number, number, number] }[] = [
  { x: 35, y: 17, burst: [-23.88, 25, 35], fade: [-63, 90, 90] },
  { x: 69, y: 23, burst: [-39.48, -18.85, -42], fade: [-76.17, 51.09, -101] },
  { x: 103, y: 29, burst: [-61.34, -46.59, 49], fade: [-100.06, 41.17, 112] },
  { x: 137, y: 17, burst: [-48.15, -110.21, -56], fade: [-87.64, -57.4, -123] },
  { x: 171, y: 23, burst: [31.86, -139.98, 63], fade: [2.84, -69.31, 134] },
  { x: 205, y: 29, burst: [59.5, -104.5, -70], fade: [27.76, -19.65, -145] },
  { x: 239, y: 17, burst: [77.05, -120.51, 77], fade: [61.7, -68.3, 156] },
  { x: 273, y: 23, burst: [135.72, -171.92, -84], fade: [110.73, -97.42, -167] },
  { x: 35, y: 29, burst: [169.61, -173.12, 91], fade: [172.96, -91.9, 178] },
  { x: 69, y: 17, burst: [224.46, -206.46, -98], fade: [216.88, -138.91, 171] },
  { x: 103, y: 23, burst: [262.85, -91.21, 105], fade: [283.84, -26.53, -160] },
  { x: 137, y: 29, burst: [329.4, -117.34, -112], fade: [330.21, -14.56, 149] },
  { x: 171, y: 17, burst: [292.31, -84.27, 119], fade: [327.21, -30.4, -138] },
  { x: 205, y: 23, burst: [341.52, -81.08, -126], fade: [357.96, 12.23, 127] },
  { x: 239, y: 29, burst: [372.1, -30.7, 133], fade: [419.01, 53.12, -116] },
  { x: 273, y: 17, burst: [407.15, -5.99, -140], fade: [431.06, 84.31, 105] },
];
const SIZES = [12, 18, 14, 22];

/**
 * "Start the pause" button. Each time `burst` increases, the stars hidden
 * behind it burst out and fade (Ready -> Burst -> Fade in Figma).
 */
export default function ConfettiButton({
  burst,
  children,
  className = "",
  ...button
}: { burst: number } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...button}
      className={`relative h-[68px] w-[326px] max-w-full cursor-pointer disabled:cursor-not-allowed ${className}`}
    >
      {burst > 0 &&
        STARS.map((star, i) => (
          <img
            // A new key per burst restarts the animation.
            key={`${burst}-${i}`}
            // The Burst-state stars from Figma (the Ready-state ones are transparent).
            src={`/figma/confetti-burst-${String(i + 1).padStart(2, "0")}.svg`}
            alt=""
            width={SIZES[i % 4]}
            height={SIZES[i % 4]}
            aria-hidden
            className="pointer-events-none absolute z-10 animate-[confetti-burst_1.1s_ease-out_forwards] opacity-0 motion-reduce:hidden"
            style={
              {
                left: star.x,
                top: star.y,
                width: SIZES[i % 4],
                height: SIZES[i % 4],
                "--burst-x": `${star.burst[0] - star.x}px`,
                "--burst-y": `${star.burst[1] - star.y}px`,
                "--burst-r": `${star.burst[2]}deg`,
                "--fade-x": `${star.fade[0] - star.x}px`,
                "--fade-y": `${star.fade[1] - star.y}px`,
                "--fade-r": `${star.fade[2]}deg`,
              } as CSSProperties
            }
          />
        ))}
      <span className="sk sk-btn absolute inset-0 flex items-center justify-center rounded-[20px] text-[34px] text-canvas sm:text-[41px]">
        {children}
      </span>
    </button>
  );
}
