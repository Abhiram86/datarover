interface PanelProps {
  children: React.ReactNode;
  size: number;
  minSize?: number;
}

export const Panel = ({ children, size, minSize = 10 }: PanelProps) => {
  return (
    <div
      className="relative flex flex-col overflow-hidden bg-primary"
      style={{ flex: `${size} 1 0%`, minWidth: `${minSize}%`, flexBasis: `${size}%` }}
    >
      {children}
    </div>
  );
};
