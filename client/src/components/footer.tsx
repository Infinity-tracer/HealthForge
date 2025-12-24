import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full bg-slate-900 dark:bg-slate-950 text-gray-400 py-4 px-4 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <Link href="/privacy-policy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/gallery" className="hover:text-white transition-colors">
            Gallery
          </Link>
        </div>
        <p className="text-xs sm:text-sm text-center sm:text-right">
          © Designed and Developed by{" "}
          <span className="text-cyan-400 font-medium">VIJAYKUMAR BK</span>,{" "}
          <span className="text-cyan-400 font-medium">SRIRAM VELUMURI</span>{" "}
        </p>
      </div>
    </footer>
  );
}
