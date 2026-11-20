import { Suspense } from "react";
import { AccountMenu, AccountMenuFallback } from "@/components/layout/account-menu";
import { CartIndicator, CartIndicatorFallback } from "@/components/layout/cart-indicator";
import { ShopFooter } from "@/components/layout/shop-footer";
import { ShopHeader } from "@/components/layout/shop-header";

/**
 * Storefront shell. The session- and cart-aware slots are streamed so the rest
 * of the header stays static with Cache Components enabled.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-shop-ink focus:px-5 focus:py-2 focus:text-sm focus:font-semibold focus:text-background"
        href="#main"
      >
        Skip to content
      </a>
      <ShopHeader
        account={
          <Suspense fallback={<AccountMenuFallback />}>
            <AccountMenu />
          </Suspense>
        }
        cart={
          <Suspense fallback={<CartIndicatorFallback />}>
            <CartIndicator />
          </Suspense>
        }
      />
      <main className="flex-1" id="main">
        {children}
      </main>
      <ShopFooter />
    </>
  );
}
