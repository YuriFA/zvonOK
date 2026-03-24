/// <reference types="vite/client" />

declare module "*.svg?react" {
  import type { SVGProps } from "react";
  const ReactComponent: React.FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
