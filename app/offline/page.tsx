import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline — Seissense Ops" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
        <WifiOff size={26} />
      </div>
      <h1 className="text-xl font-semibold text-ink">You&apos;re offline</h1>
      <p className="max-w-xs text-fs14 text-muted">
        The portal needs a connection to show live orders and stock. Reconnect and try again.
      </p>
      <a
        href="/dashboard"
        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-fs14 font-medium text-white"
      >
        Retry
      </a>
    </div>
  );
}
