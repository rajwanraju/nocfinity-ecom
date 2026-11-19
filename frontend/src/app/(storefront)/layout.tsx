import { Suspense } from "react";
import { AccountMenu, AccountMenuFallback } from "@/components/layout/account-menu";
import { ShopFooter } from "@/components/layout/shop-footer";
import { ShopHeader } from "@/components/layout/shop-header";

/**
 * Storefront shell. The session-aware account slot is streamed so the rest of
 * the header stays static with Cache Components enabled.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopHeader
        account={
          <Suspense fallback={<AccountMenuFallback />}>
            <AccountMenu />
          </Suspense>
        }
        cartCount={0}
      />
      <main className="flex-1" id="main">
        {children}
      </main>
      <ShopFooter />
    </>
  );
}
