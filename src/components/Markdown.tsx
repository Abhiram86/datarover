import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

export const Markdown = ({
  content,
  className,
}: {
  content: string;
  className?: string;
}) => {
  return (
    <Streamdown
      plugins={{
        code: code,
      }}
      shikiTheme={["github-dark", "github-dark"]}
      // !max-w-none is critical to prevent the prose container from
      // restricting the code block's width.
      className={`prose !max-w-none 
        /* Reset Typography's line-wrapping logic */
        prose-pre:whitespace-pre-wrap 
        prose-pre:break-words
        prose-pre:bg-transparent
        prose-pre:p-0
        /* Remove the backticks Tailwind adds to inline code */
        prose-code:before:content-none 
        prose-code:after:content-none
        ${className}`}
    >
      {content}
    </Streamdown>
  );
};
