import { Link } from "@tanstack/react-router";

function Header() {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-strong/5 bg-primary/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 font-black text-2xl tracking-tighter text-neutral-strong">
          <div className="bg-neutral-strong p-1 rounded-lg">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 11V13M9 8V16M14 5V19M19 11V13"
                stroke="#f8fceb"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          Data Rover
        </div>
        <div className="hidden md:flex items-center gap-10 text-neutral-strong/70 font-bold text-[13px] uppercase tracking-widest">
          <a href="#" className="hover:text-neutral-strong transition-colors">
            Workspace
          </a>
          <a href="#" className="hover:text-neutral-strong transition-colors">
            The Memory System
          </a>
          <a href="#" className="hover:text-neutral-strong transition-colors">
            Changelog
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="relative z-10">
            <button className="px-5 py-2.5 text-neutral-strong font-bold text-sm hover:text-neutral-strong/70 transition-colors">
              Sign In
            </button>
          </Link>
          <Link to="/register" className="relative z-10">
            <button className="px-6 py-2.5 bg-neutral-strong cursor-pointer text-primary rounded-full font-bold text-sm overflow-hidden transition-all hover:shadow-lg">
              Get Started
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Header;
