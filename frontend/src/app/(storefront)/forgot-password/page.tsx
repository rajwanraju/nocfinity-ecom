import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset link for your Nocfinity account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="shop-container py-14 sm:py-20">
      <ForgotPasswordForm />
    </div>
  );
}
