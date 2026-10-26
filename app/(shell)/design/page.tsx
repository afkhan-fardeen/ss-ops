import { notFound } from "next/navigation";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { DesignGallery } from "@/components/design/DesignGallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design gallery" };

/** Visual QA page for the design system. Local dev, or portal admins in production. */
export default async function DesignPage() {
  if (process.env.NODE_ENV === "production" && !(await isPortalAdmin())) notFound();
  return <DesignGallery />;
}
