export default function Footer() {
  return (
    <footer className="bg-neutral-strong text-primary py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="font-black text-2xl tracking-tighter">Data Rover</div>
        <div className="flex gap-8 text-xs font-bold uppercase tracking-widest opacity-60">
          <a href="#" className="hover:opacity-100">
            Privacy
          </a>
          <a href="#" className="hover:opacity-100">
            Terms
          </a>
          <a href="#" className="hover:opacity-100">
            Contact
          </a>
        </div>
        <div className="text-[10px] font-mono opacity-40">
          © 2026 DATA_ROVER_WORKSPACE
        </div>
      </div>
    </footer>
  );
}
