export type Brand = "dragon" | "ehc";

export const BRAND_COOKIE = "helfertool-brand";

export const BRANDS: Record<
  Brand,
  {
    clubName: string;
    headline: string;
    logo: string;
    logoWidth: number;
    logoHeight: number;
    favicon: string;
  }
> = {
  dragon: {
    clubName: "HC Dragon Thun",
    headline: "Dragon Thun · Helfertool",
    logo: "/dragon-logo.png",
    logoWidth: 333,
    logoHeight: 400,
    favicon: "/favicon-dragon.png",
  },
  ehc: {
    clubName: "EHC Thun",
    headline: "EHC Thun · Helfertool",
    logo: "/ehc-logo.png",
    logoWidth: 497,
    logoHeight: 601,
    favicon: "/favicon-ehc.png",
  },
};

export function parseBrand(value: string | undefined | null): Brand {
  return value === "ehc" ? "ehc" : "dragon";
}
