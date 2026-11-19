import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-shop-surface px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-shop-line bg-background p-7 shadow-sm sm:p-9">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          }
        >
          <LoginForm
            description="Staff access to orders, products, and store operations."
            endpoint="/api/admin/auth/login"
            redirectTo="/admin"
            title="Admin sign in"
          />
        </Suspense>
      </div>
    </main>
  );
}
