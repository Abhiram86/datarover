import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { registerFn, getCurrentUserFn } from "@/utils/auth.functions";
import { useUserStore } from "@/store/user";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/register")({
  component: RegisterComponent,
  beforeLoad: async () => {
    const user = await getCurrentUserFn();
    if (user) {
      throw redirect({ to: "/workspace" });
    }
  },
});

function RegisterComponent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const register = useServerFn(registerFn);
  const setUser = useUserStore((state) => state.setUser);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await register({ data: { name, email, password } });
      if (result.success) {
        setUser(result.user);
        toast.success("Account created successfully!");
        navigate({ to: "/workspace" });
      } else {
        toast.error(result.error?.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 font-black text-2xl tracking-tighter text-neutral-strong mb-12">
          <div className="bg-neutral-strong p-1.5 rounded-lg">
            <svg
              width="28"
              height="28"
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

        {/* Card */}
        <div className="bg-linear-to-b from-primary-muted to-primary rounded-4xl border border-neutral-strong/5 p-8 shadow-[0_30px_60px_-15px_rgba(2,6,23,0.08)]">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-neutral-strong tracking-tight mb-2">
              Create account
            </h1>
            <p className="text-sm text-neutral-strong/50 font-medium">
              Start your data analysis journey today
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-strong/60 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="w-full px-4 py-3 rounded-xl bg-primary border border-neutral-strong/10 text-sm font-medium text-neutral-strong placeholder:text-neutral-strong/30 focus:outline-none focus:border-neutral-strong/30 transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-strong/60 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-primary border border-neutral-strong/10 text-sm font-medium text-neutral-strong placeholder:text-neutral-strong/30 focus:outline-none focus:border-neutral-strong/30 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-strong/60 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-primary border border-neutral-strong/10 text-sm font-medium text-neutral-strong placeholder:text-neutral-strong/30 focus:outline-none focus:border-neutral-strong/30 transition-colors pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-strong/30 hover:text-neutral-strong/60 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-neutral-strong/40 font-medium">
                Must be at least 6 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-strong text-primary rounded-xl text-sm font-black uppercase tracking-widest hover:shadow-xl hover:shadow-neutral-strong/10 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-6"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} strokeWidth={3} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-strong/5">
            <p className="text-center text-sm text-neutral-strong/50 font-medium">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-neutral-strong font-bold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
