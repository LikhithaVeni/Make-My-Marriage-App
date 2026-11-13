"use client";

import { createContext, useContext } from "react";

/** The signed-in wedding and person, shown in the app's menus. */
export interface WeddingBrand {
  title: string;
  monogram: string;
  /** The signed-in person's name, beside Log out. */
  userName: string;
  /** Their role in the wedding; Settings shows for Admins only. */
  role: "ADMIN" | "MANAGER" | "PHOTOGRAPHER";
}

const BrandContext = createContext<WeddingBrand>({
  title: "",
  monogram: "",
  userName: "",
  role: "MANAGER",
});

/** Shares the brand with client parts of the shell, such as the mobile menu. */
export function WeddingBrandProvider({
  brand,
  children,
}: {
  brand: WeddingBrand;
  children: React.ReactNode;
}) {
  return <BrandContext value={brand}>{children}</BrandContext>;
}

export function useWeddingBrand(): WeddingBrand {
  return useContext(BrandContext);
}
