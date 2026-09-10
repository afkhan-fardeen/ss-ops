import { TechBackground } from "@/components/motion/TechBackground";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TechBackground />
      {children}
    </>
  );
}
