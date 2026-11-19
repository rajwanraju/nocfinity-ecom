import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Nocfinity account to track orders and check out faster.",
};

export default function LoginPage() {
  return (
    <div className="shop-container py-14 sm:py-20">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-md space-y-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        }
      >
        <LoginForm
          description="Access your orders, saved details, and a faster checkout."
          endpoint="/api/auth/login"
          redirectTo="/account"
          title="Sign in"
        />
      </Suspense>
    </div>
  );
}
