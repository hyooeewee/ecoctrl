import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "shadow-intensity"?: string;
          "environment-image"?: string;
          exposure?: string;
          "interaction-prompt"?: string;
          "interaction-prompt-style"?: string;
          "camera-orbit"?: string;
          "field-of-view"?: string;
          ar?: boolean;
          "ar-modes"?: string;
          loading?: "auto" | "lazy" | "eager";
          reveal?: "auto" | "interaction" | "manual";
          poster?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}
