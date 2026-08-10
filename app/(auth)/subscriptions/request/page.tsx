import { GlassCard } from "@/components/ui/GlassCard";
import { PublicSubscriptionForm } from "@/components/subscriptions/PublicSubscriptionForm";

export const metadata = {
  title: "Subscription Request — Seissense",
};

export default function PublicSubscriptionRequestPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Seissense" className="h-9 w-auto" />
        <p className="text-[12px] text-muted">Finance Department — Subscription Request Form</p>
      </div>

      <GlassCard className="w-full max-w-2xl p-6 sm:p-8">
        <h1 className="font-display text-xl font-medium text-ink sm:text-2xl">
          Subscription request
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Complete this form for all new subscription requests. Use your official company email
          address only.
        </p>
        <div className="mt-6">
          <PublicSubscriptionForm />
        </div>
      </GlassCard>

      <p className="mt-6 text-center text-[11px] text-muted">
        Form No. SUB · Seissense Operations
      </p>
    </div>
  );
}
