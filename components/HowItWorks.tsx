/* eslint-disable @next/next/no-img-element -- static SVG design assets */

const ASSETS = "/figma/how-it-works";
const wiggle = "motion-loop block w-full animate-[star-wiggle-mirror_2s_linear_infinite]";

type Step = {
  number: string;
  title: string;
  lines: [string, string];
  dark: boolean;
  badge: string;
  /** The three decorative stars on this card, in Figma order. */
  stars: [string, string, string];
};

const STEPS: Step[] = [
  {
    number: "01",
    title: "Save your find",
    lines: ["Upload what you’re", "thinking of buying."],
    dark: false,
    badge: "badge-a",
    stars: ["deco1", "deco2", "deco3"],
  },
  {
    number: "02",
    title: "Wait 24 hours",
    lines: ["Give yourself 24 hours", "to think it over."],
    dark: true,
    badge: "badge-a",
    stars: ["deco4", "deco5", "deco6"],
  },
  {
    number: "03",
    title: "Decide mindfully",
    lines: ["Still want it? Make", "a considered choice."],
    dark: false,
    badge: "badge-c",
    stars: ["deco7", "deco8", "deco9"],
  },
];

/** A star that keeps its tilt from Figma while it wiggles. */
function TiltedStar({ src, width, tilt, className }: { src: string; width: number; tilt: number; className: string }) {
  return (
    <span aria-hidden className={`absolute ${className}`} style={{ width, transform: `rotate(${tilt}deg)` }}>
      <img src={`${ASSETS}/${src}.svg`} alt="" width={width} height={width} className={wiggle} />
    </span>
  );
}

/** "How does it work?" on the home page: three numbered steps and a row of stars. */
export default function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="mx-auto mt-20 w-full max-w-[1572px] sm:mt-32 lg:mt-[150px]">
      <div className="flex items-center justify-center gap-3 sm:gap-6">
        <span aria-hidden className="w-9 shrink-0 sm:w-[65px]">
          <img src={`${ASSETS}/head-l.svg`} alt="" width={64} height={59} className={wiggle} />
        </span>
        <h2 id="how-it-works" className="text-center text-[30px] leading-tight text-btn min-[400px]:text-[34px] sm:text-[60px] lg:text-[74px]">
          How does it work?
        </h2>
        <span aria-hidden className="w-9 shrink-0 sm:w-[65px]">
          <img src={`${ASSETS}/head-r.svg`} alt="" width={64} height={59} className={wiggle} />
        </span>
      </div>

      <div className="relative mt-16 lg:mt-[154px]">
        {/* Dotted line joining the cards (behind them, visible in the gaps). */}
        <img
          src={`${ASSETS}/connector.svg`}
          alt=""
          aria-hidden
          width={1082}
          height={4}
          className="absolute left-[14.6%] top-1/2 hidden w-[68.8%] -translate-y-1/2 lg:block"
        />
        <ol className="relative grid gap-16 lg:grid-cols-3 lg:gap-[48px]">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className={`sk relative mx-auto flex min-h-[300px] w-full max-w-[493px] flex-col items-center rounded-[48px] px-6 pb-20 pt-[78px] text-center sm:rounded-[69px] lg:h-[350px] lg:pb-12 lg:pt-[94px] ${
                step.dark ? "text-white [--sk-bg:#6384a3]" : "text-[#335470] [--sk-bg:#9bbddd]"
              }`}
            >
              <span aria-hidden className="absolute left-1/2 top-[-38px] flex size-[76px] -translate-x-1/2 items-center justify-center">
                <img src={`${ASSETS}/${step.badge}.svg`} alt="" width={96} height={96} className="absolute inset-[-13.16%] size-[96px] max-w-none" />
                <span className="relative text-[36px] text-white">{step.number}</span>
              </span>
              <TiltedStar src={step.stars[0]} width={34} tilt={12} className="left-[35px] top-[44px]" />
              <TiltedStar src={step.stars[1]} width={23} tilt={-15} className="right-[37px] top-[48px]" />
              <TiltedStar src={step.stars[2]} width={32} tilt={8} className="bottom-[34px] right-[50px]" />

              <h3 className="text-[40px] leading-[64px] sm:text-[48px]">
                <span className="sr-only">Step {Number(step.number)}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-[24px] leading-[38px] sm:text-[28px] sm:leading-[42px]">
                {step.lines[0]}
                <br />
                {step.lines[1]}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Row of stars closing the section (fewer on small screens). */}
      <div aria-hidden className="mx-auto mt-16 flex max-w-[1380px] justify-between lg:mt-[119px]">
        {Array.from({ length: 15 }, (_, i) => (
          <span key={i} className={`w-7 sm:w-[36px] ${i >= 7 ? "hidden sm:block" : ""}`}>
            <img src={`${ASSETS}/div${i + 1}.svg`} alt="" width={36} height={33} className={wiggle} />
          </span>
        ))}
      </div>
    </section>
  );
}
