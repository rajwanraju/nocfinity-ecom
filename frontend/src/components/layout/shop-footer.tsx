import Link from "next/link";
import { AtSign, Camera, CodeXml, Send } from "lucide-react";

const footerGroups = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/products" },
      { label: "New arrivals", href: "/products?sort=newest" },
      { label: "On sale", href: "/products?on_sale=1" },
      { label: "Your cart", href: "/cart" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "My orders", href: "/account/orders" },
      { label: "My profile", href: "/account" },
      { label: "Your cart", href: "/cart" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Customer support", href: "/#support" },
      { label: "Delivery details", href: "/#delivery" },
      { label: "Returns", href: "/#returns" },
      { label: "Terms & conditions", href: "/#terms" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Careers", href: "/#careers" },
      { label: "Privacy policy", href: "/#privacy" },
      { label: "Contact", href: "/#contact" },
    ],
  },
];

const socials = [
  { label: "X social profile", Icon: AtSign, href: "https://x.com" },
  { label: "Community", Icon: Send, href: "https://t.me" },
  { label: "Instagram", Icon: Camera, href: "https://instagram.com" },
  { label: "GitHub", Icon: CodeXml, href: "https://github.com" },
];

export function ShopFooter() {
  return (
    <footer className="relative mt-28 bg-shop-surface pt-24 sm:mt-32">
      <div className="shop-container">
        <div className="absolute inset-x-4 -top-[76px] rounded-[20px] bg-shop-ink px-6 py-7 text-background sm:-top-[82px] sm:flex sm:items-center sm:justify-between sm:px-10 sm:py-9 lg:inset-x-0 lg:px-16">
          <h2 className="max-w-[540px] text-[26px] leading-[1.1] font-extrabold tracking-[-.5px] uppercase sm:text-[32px] lg:text-[36px]">
            Stay up to date about our latest offers
          </h2>
          <Link
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-shop-tile sm:mt-0 sm:w-[350px]"
            href="/products"
          >
            Shop the new arrivals
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-9 border-b border-shop-line pb-8 sm:grid-cols-3 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr] lg:gap-8 lg:pb-12">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link className="text-[28px] font-black tracking-[-1.4px]" href="/">
              NOCFINITY
            </Link>
            <p className="mt-3 max-w-[300px] text-sm leading-6 text-shop-muted">
              Considered essentials, fresh arrivals, and everyday style — from women to men.
            </p>
            <div aria-label="Social media" className="mt-5 flex gap-3">
              {socials.map(({ label, Icon, href }) => (
                <a
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-full border border-shop-line bg-background text-foreground transition hover:bg-shop-ink hover:text-background"
                  href={href}
                  key={label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon aria-hidden="true" size={15} />
                </a>
              ))}
            </div>
          </div>

          {footerGroups.map((group) => (
            <nav aria-label={group.title} className="flex flex-col gap-3" key={group.title}>
              <h3 className="mb-1 text-xs font-semibold tracking-[2px] uppercase">{group.title}</h3>
              {group.links.map((link) => (
                <Link
                  className="text-sm text-shop-muted transition hover:text-foreground"
                  href={link.href}
                  key={link.label}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 py-5 text-center text-xs text-shop-muted sm:flex-row sm:text-left">
          <p>Nocfinity © 2026, All rights reserved</p>
          <div aria-label="Accepted payment methods" className="flex items-center gap-2">
            {["VISA", "Mastercard", "PayPal", "Apple Pay", "G Pay"].map((method) => (
              <span
                className="rounded-md border border-shop-line bg-background px-2 py-1 text-[10px] font-bold tracking-tight text-shop-ink"
                key={method}
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
