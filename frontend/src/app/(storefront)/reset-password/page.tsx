import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Nocfinity account.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="shop-container py-14 sm:py-20">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-md space-y-4">
            <Skeleton className="h-10 w-52" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
