import React, { useCallback, useEffect, useRef, useState } from "react";

interface ResizeHandleProps {
  onResize: (e: MouseEvent) => void;
  direction: "horizontal" | "vertical";
}

const ResizeHandle = ({ onResize, direction }: ResizeHandleProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const startDragging = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const stopDragging = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onResize);
      window.addEventListener("mouseup", stopDragging);
    }
    return () => {
      window.removeEventListener("mousemove", onResize);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [isDragging, onResize, stopDragging]);

  return (
    <div
      onMouseDown={startDragging}
      className={`
        relative z-20 flex items-center justify-center
        transition-colors duration-150 hover:bg-neutral-strong/20
        ${isDragging ? "bg-neutral-strong/30" : "bg-neutral-strong/5"}
        ${direction === "horizontal" ? "w-1 cursor-col-resize h-full" : "h-1 cursor-row-resize w-full"}
      `}
    >
      {/* Visual Knurling/Handle */}
      <div
        className={`${direction === "horizontal" ? "h-8 w-0.75" : "w-8 h-0.75"} bg-blue-500 rounded-full`}
      />
    </div>
  );
};

interface PanelGroupProps {
  children: React.ReactNode;
  direction?: "horizontal" | "vertical";
  className?: string;
}

interface ResizableChildProps {
  size: number;
}

export const PanelGroup = ({
  children,
  direction = "horizontal",
  className = "",
}: PanelGroupProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[]>(() => {
    const count = React.Children.count(children);
    const initialSizes: number[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<ResizableChildProps>(child)) {
        initialSizes.push(child.props.size || 100 / count);
      }
    });
    if (initialSizes.length > 0) return initialSizes;
    if (count === 0) return [];
    return new Array(count).fill(100 / count);
  });

  const handleResize = useCallback(
    (index: number, event: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newSizes = [...sizes];

      let percentage;
      if (direction === "horizontal") {
        const offset = event.clientX - containerRect.left;
        percentage = (offset / containerRect.width) * 100;
      } else {
        const offset = event.clientY - containerRect.top;
        percentage = (offset / containerRect.height) * 100;
      }

      // Simple constraint: don't let panels disappear
      const currentTotal = sizes[index] + sizes[index + 1];
      const leftConstraint = 5;
      const rightConstraint = currentTotal - 5;

      // Calculate sum of sizes before the current handle
      const sumBefore = sizes.slice(0, index).reduce((a, b) => a + b, 0);
      const relativePos = percentage - sumBefore;

      if (relativePos > leftConstraint && relativePos < rightConstraint) {
        const diff = sizes[index] - relativePos;
        newSizes[index] = relativePos;
        newSizes[index + 1] = sizes[index + 1] + diff;
        setSizes(newSizes);
      }
    },
    [direction, sizes],
  );

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full overflow-hidden border border-neutral-strong/5 ${direction === "vertical" ? "flex-col" : "flex-row"} ${className}`}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement<ResizableChildProps>(child)) return null;
        const isLast = index === React.Children.count(children) - 1;
        return (
          <>
            {React.cloneElement(child, { size: sizes[index] })}
            {!isLast && (
              <ResizeHandle
                direction={direction}
                onResize={(e) => handleResize(index, e)}
              />
            )}
          </>
        );
      })}
    </div>
  );
};
