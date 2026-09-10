import { MeshBackground } from "@/components/motion/MeshBackground";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MeshBackground />
      {children}
    </>
  );
}
