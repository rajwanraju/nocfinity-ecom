"use client";

import Link from "next/link";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";

const navigation = [
  { label: "Shop", href: "/products" },
  { label: "On Sale", href: "/products?on_sale=1" },
  { label: "New Arrivals", href: "/products?sort=newest" },
  { label: "Brands", href: "/#brands" },
];

type ShopHeaderProps = {
  /** Cart quantity badge; P9 wires this to the live cart. */
  cartCount?: number;
  /** Server-rendered account menu, streamed behind Suspense by the layout. */
  account?: ReactNode;
};

export function ShopHeader({ cartCount = 0, account }: ShopHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="bg-shop-ink px-4 py-2 text-center text-[11px] font-medium text-background sm:text-xs">
        Free delivery on orders over $100.{" "}
        <Link className="font-semibold underline underline-offset-2" href="/products">
          Shop now
        </Link>
      </div>

      <header className="border-b border-shop-line bg-background">
        <div className="shop-container flex h-[68px] items-center gap-3 sm:h-[76px] sm:gap-4">
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="grid size-9 place-items-center rounded-full lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
          </button>

          <Link
            aria-label="NOCFINITY home"
            className="shrink-0 text-[24px] leading-none font-black tracking-[-1.3px] sm:text-[25px]"
            href="/"
          >
            NOCFINITY
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 pl-5 lg:flex">
            {navigation.map((item) => (
              <Link
                className="text-sm text-shop-ink transition hover:text-shop-muted"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form
            action="/products"
            className="ml-auto hidden min-w-0 flex-1 lg:block lg:px-4 xl:px-8"
            role="search"
          >
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-shop-muted"
                size={18}
              />
              <Input
                aria-label="Search for products"
                className="h-11 rounded-full border-0 bg-shop-tile pr-4 pl-11"
                name="q"
                placeholder="Search for products..."
                type="search"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <Link
              aria-label={`Shopping bag, ${cartCount} items`}
              className="relative grid size-9 place-items-center rounded-full transition hover:bg-shop-surface"
              href="/cart"
            >
              <ShoppingBag aria-hidden="true" size={21} />
              {cartCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-shop-ink px-1 text-[9px] leading-4 font-semibold text-background">
                  {cartCount}
                </span>
              ) : null}
            </Link>

            {account ?? (
              <Link
                aria-label="Your account"
                className="hidden size-9 place-items-center rounded-full transition hover:bg-shop-surface sm:grid"
                href="/account"
              >
                <UserRound aria-hidden="true" size={21} />
              </Link>
            )}
          </div>
        </div>

        {menuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col gap-1 border-t border-shop-line px-5 py-3 lg:hidden"
          >
            {navigation.map((item) => (
              <Link
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-shop-ink hover:bg-shop-surface"
                href={item.href}
                key={item.label}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
    </>
  );
}
