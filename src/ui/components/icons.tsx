import type { CSSProperties, ReactNode } from "react";

// One small, consistent icon set — 16px grid, single 1.5 stroke weight, currentColor — so
// icons inherit their button's colour and read as one crafted family (not Unicode glyphs).
type IconProps = { size?: number; className?: string; style?: CSSProperties };

function Svg({ size = 16, className, style, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      style={{ flex: "0 0 auto", ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const ChevronIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4l4 4-4 4" {...stroke} />
  </Svg>
);

// Reveal-on-canvas: a bullseye/target.
export const RevealIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5" {...stroke} />
    <circle cx="8" cy="8" r="1.25" fill="currentColor" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.5l3 3 6-6.5" {...stroke} />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4l8 8M12 4l-8 8" {...stroke} />
  </Svg>
);

export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1.5 8Q8 2.5 14.5 8Q8 13.5 1.5 8Z" {...stroke} />
    <circle cx="8" cy="8" r="1.75" {...stroke} />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h9" {...stroke} />
    <path d="M8.5 4.5L12 8l-3.5 3.5" {...stroke} />
  </Svg>
);

// Drawn form controls (CSS-var brand via `style` since presentation attrs don't read vars).
const brand = "var(--figma-color-bg-brand, #0d99ff)";
const onBrand = "var(--figma-color-text-onbrand, #ffffff)";

export const CheckboxIcon = ({ checked, size = 16 }: IconProps & { checked: boolean }) => (
  <Svg size={size}>
    {checked ? (
      <>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" style={{ fill: brand }} />
        <path
          d="M4.5 8.2l2.4 2.4 4.6-5.2"
          style={{ stroke: onBrand }}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ) : (
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="3.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
    )}
  </Svg>
);

export const RadioIcon = ({ selected, size = 16 }: IconProps & { selected: boolean }) => (
  <Svg size={size}>
    {selected ? (
      <>
        <circle cx="8" cy="8" r="6.25" fill="none" style={{ stroke: brand }} strokeWidth="1.5" />
        <circle cx="8" cy="8" r="3" style={{ fill: brand }} />
      </>
    ) : (
      <circle
        cx="8"
        cy="8"
        r="6.25"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
    )}
  </Svg>
);
