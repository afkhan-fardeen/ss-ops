import { Toaster } from "sonner";
import { Sidebar } from "@/components/portal/Sidebar";
import { Topbar } from "@/components/portal/Topbar";

const BOOT_SCRIPT = `
(function(){try{
  var c = localStorage.getItem('portal.sidebar.collapsed')==='1';
  var w = window.matchMedia && window.matchMedia('(min-width: 768px)').matches
    ? (c ? '68px' : '240px')
    : '0px';
  document.documentElement.style.setProperty('--sb-w', w);
}catch(e){document.documentElement.style.setProperty('--sb-w','240px');}})();
`;

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }}
      />
      <Sidebar />
      <div style={{ marginLeft: "var(--sb-w, 240px)" }} className="transition-[margin] duration-200">
        <Topbar />
        <main className="px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
