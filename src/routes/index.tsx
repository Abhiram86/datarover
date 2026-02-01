import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { createFileRoute } from "@tanstack/react-router";
import { Brain, Code, FileClock } from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <>
      <Header />

      <main>
        <Hero />

        {/* Requirement 1: The Workspace Visualization */}
        <ProductPreview />

        {/* Requirement 3, 4, 6: Modular Features */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-32">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Code className="w-7 h-7" />}
              tag="Executor"
              title="Python Engine"
              content="Full support for Pandas and Polars. Perform complex transformations safely in a web-based sandbox."
            />
            <FeatureCard
              icon={<FileClock className="w-7 h-7" />}
              tag="Tracker"
              title="Change Logging"
              content="Every row modification is recorded. Browse through your transformation history like a professional version control system."
            />
            <FeatureCard
              icon={<Brain className="w-7 h-7" />}
              tag="Memory"
              title="Insight Recall"
              content="The Memory System stores your observations, making them available to reference in future chat sessions automatically."
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

const Hero = () => (
  <section className="relative pt-24 pb-16 px-6 bg-grid-mesh">
    <div className="max-w-4xl mx-auto text-center">
      <div className="inline-block px-4 py-1 mb-6 rounded-full bg-primary-muted border border-neutral-strong/10 text-[10px] font-black text-neutral-strong uppercase tracking-[0.2em]">
        The Web-First Data Environment
      </div>
      <h1 className="text-6xl md:text-8xl font-black text-neutral-strong leading-[0.9] mb-8 tracking-tighter">
        Data analysis <br />
        <span className="text-neutral-strong/40">without limits.</span>
      </h1>
      <p className="text-xl text-neutral max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
        An interactive workspace for Excel and CSV data. Execute Python, track
        every change, and build a persistent memory of your insights.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <button className="px-10 py-4 bg-neutral-strong text-primary rounded-2xl font-black text-lg hover:-translate-y-1 transition-all shadow-2xl">
          Open Workspace
        </button>
      </div>
    </div>
  </section>
);

const ProductPreview = () => (
  <section className="max-w-6xl mx-auto px-6 py-12 relative z-10">
    <div className="bg-neutral-strong p-2 rounded-[2.5rem] shadow-2xl">
      <div className="bg-primary rounded-[1.8rem] h-137.5 flex overflow-hidden border border-white/10">
        {/* Chat Panel */}
        <div className="w-1/4 border-r border-neutral-strong/5 p-4 flex flex-col gap-4 bg-primary-muted/30">
          <div className="h-4 w-1/2 bg-neutral-strong/10 rounded mb-2" />
          <div className="p-3 bg-white rounded-xl border border-neutral-strong/5 shadow-sm text-[10px] font-medium">
            "How did sales perform in Q4?"
          </div>
          <div className="mt-auto h-10 w-full bg-white border border-neutral-strong/5 rounded-xl flex items-center px-4 text-[10px] text-neutral-strong/30">
            Ask Assistant...
          </div>
        </div>
        {/* Data Panel */}
        <div className="flex-1 p-6 bg-white overflow-hidden">
          <div className="flex justify-between mb-6">
            <div className="h-4 w-32 bg-neutral-strong/5 rounded" />
            <div className="h-4 w-12 bg-neutral-strong/10 rounded" />
          </div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex gap-3">
                {[...Array(4)].map((_, j) => (
                  <div
                    key={j}
                    className={`h-8 flex-1 rounded-lg ${i === 0 ? "bg-neutral-strong text-primary" : "bg-neutral-strong/5"}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Code Panel */}
        <div className="w-1/3 bg-neutral-strong selection:bg-neutral p-6 font-mono text-[11px] text-blue-300">
          <div className="text-gray-500 mb-6 font-bold tracking-widest uppercase">
            # Python 3.10
          </div>
          <span className="text-purple-400 font-bold">import</span> pandas{" "}
          <span className="text-purple-400">as</span> pd <br />
          df = pd.read_csv(
          <span className="text-green-400">'finance_data.csv'</span>) <br />
          <br />
          <span className="text-gray-500 italic">
            # Memory System Context: Prev. Discovery
          </span>
          <br />
          df_clean = df.filter(revenue &gt; 0)
          <div className="animate-pulse inline-block w-2 h-4 bg-blue-400 align-middle ml-1" />
        </div>
      </div>
    </div>
  </section>
);

interface FeatureCardProps {
  title: string;
  content: string;
  tag: string;
  icon: React.ReactNode;
}

const FeatureCard = ({ title, content, tag, icon }: FeatureCardProps) => (
  <div className="group relative p-8 rounded-[2.5rem] bg-white border border-neutral-strong/5 hover:border-neutral-strong/20 transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(2,6,23,0.1)]">
    <div className="flex items-center justify-between mb-4">
      <div className="text-3xl">{icon}</div>
      <div className="px-3 py-1 rounded-full bg-primary-muted text-[10px] font-black uppercase tracking-widest text-neutral-strong/50 border border-neutral-strong/5">
        {tag}
      </div>
    </div>
    <h3 className="text-2xl font-black text-neutral-strong mb-4 tracking-tight">
      {title}
    </h3>
    <p className="text-neutral leading-relaxed text-[15px] font-medium">
      {content}
    </p>
  </div>
);
