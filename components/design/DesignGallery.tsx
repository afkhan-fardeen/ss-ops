"use client";

import { useState } from "react";
import { Download, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton, ListSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusPill } from "@/components/portal/StatusPill";

const SWATCHES = [
  ["primary", "bg-primary"], ["orders", "bg-orders-solid"], ["inventory", "bg-inventory-solid"], ["finance", "bg-finance-solid"],
  ["system", "bg-system-solid"], ["success", "bg-success"], ["warning", "bg-warning"], ["danger", "bg-danger"], ["info", "bg-info"],
] as const;

const ROLES = [
  ["display", "text-display font-semibold"], ["title", "text-title font-semibold"], ["heading", "text-heading font-semibold"],
  ["body-lg", "text-body-lg"], ["body", "text-body"], ["body-sm", "text-body-sm"], ["caption", "text-caption"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-heading font-semibold text-ink">{title}</h2>
      <div className="rounded-card border border-line bg-white p-4 shadow-soft">{children}</div>
    </section>
  );
}

export function DesignGallery() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Section title="Colours">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="space-y-1.5">
              <div className={`h-12 rounded-control ${cls}`} />
              <p className="text-caption text-muted">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type roles">
        <div className="space-y-2">
          {ROLES.map(([name, cls]) => (
            <p key={name} className={`${cls} text-ink`}>
              {name} — Fulfil orders faster
            </p>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<Send size={16} />}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tonal" icon={<Plus size={16} />}>Tonal</Button>
          <Button variant="danger" icon={<Trash2 size={16} />}>Danger</Button>
          <Button variant="dangerSoft">Reject</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button size="lg" pill icon={<Download size={16} />}>Large pill</Button>
          <Button disabled>Disabled</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 2000);
            }}
          >
            Loading state
          </Button>
        </div>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success("Fulfilled 2 of 2", { description: "Both orders were pushed to Shopify." })}>Success</Button>
          <Button variant="secondary" onClick={() => toast.error("Could not push #MOVE-252820", { description: "No open fulfillment orders (already fulfilled)." })}>Error</Button>
          <Button variant="secondary" onClick={() => toast.warning("Ubex is slow", { description: "Matching may take a little longer than usual." })}>Warning</Button>
          <Button variant="secondary" onClick={() => toast.info("A new version is ready", { action: { label: "Reload", onClick: () => {} } })}>Info + action</Button>
          <Button variant="secondary" onClick={() => { const id = toast.loading("Syncing 12 products…"); setTimeout(() => toast.success("Synced 12 products", { id }), 2200); }}>Loading → done</Button>
        </div>
      </Section>

      <Section title="Loading and progress">
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-primary"><Spinner size={16} /><Spinner size={20} /><Spinner size={28} /></div>
          <ProgressBar value={64} label="Determinate" />
          <ProgressBar value={100} tone="success" label="Complete" />
          <ProgressBar label="Indeterminate" />
          <div className="grid gap-3 sm:grid-cols-2">
            <CardSkeleton />
            <ListSkeleton rows={2} />
          </div>
          <Skeleton className="h-8 w-40" />
        </div>
      </Section>

      <Section title="Stat cards and status">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Unfulfilled" value="12" hint="orders" accentClass="border-l-orders-solid" />
          <StatCard label="Mismatches" value="38" hint="2h ago" accentClass="border-l-inventory-solid" />
          <StatCard label="Spend" value="BHD 420" hint="this month" accentClass="border-l-finance-solid" />
          <StatCard label="Critical" value="3" accentClass="border-l-danger" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill tone="accent">Ready to push</StatusPill>
          <StatusPill tone="amber">Waiting for Ubex</StatusPill>
          <StatusPill tone="green">Fulfilled</StatusPill>
          <StatusPill tone="red">Error</StatusPill>
          <StatusPill tone="neutral">Skipped</StatusPill>
        </div>
      </Section>
    </div>
  );
}
