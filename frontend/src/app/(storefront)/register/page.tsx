import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Nocfinity account to track orders and check out faster.",
};

export default function RegisterPage() {
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
        <RegisterForm />
      </Suspense>
    </div>
  );
}
