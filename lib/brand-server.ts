import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getViewerCategories } from "@/lib/viewer-scope";
import { BRAND_COOKIE, parseBrand, type Brand } from "@/lib/brand";

/**
 * Welche Marke (HC Dragon Thun = Nachwuchs, EHC Thun = Aktive) gerade
 * angezeigt wird. Angemeldete Mitglieder und Stufenadmins einer einzigen
 * Kategorie sehen immer die Marke ihrer Kategorie. Für alle anderen
 * (Geschäftsstelle, Funktionäre, nicht angemeldet) entscheidet der Cookie, den
 * die Einstiegsadressen /dragonthun und /ehcthun setzen — Standard ist Dragon.
 */
export async function getBrand(): Promise<Brand> {
  const session = await auth();
  if (session?.user) {
    const categories = await getViewerCategories(session.user);
    if (categories && categories.length === 1) {
      return categories[0] === "AKTIV" ? "ehc" : "dragon";
    }
  }
  return parseBrand((await cookies()).get(BRAND_COOKIE)?.value);
}

export async function rememberBrand(brand: Brand) {
  (await cookies()).set(BRAND_COOKIE, brand, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
