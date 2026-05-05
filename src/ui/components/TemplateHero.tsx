import type { ReactNode } from "react";

import type { currentTool } from "../../config/tool";

type TemplateHeroProps = {
  tool: typeof currentTool;
  children: ReactNode;
};

export function TemplateHero(props: TemplateHeroProps) {
  return (
    <header className="hero">
      <div className="hero__copy">
        <p className="eyebrow">TOOL TEMPLATE</p>
        <h1>{props.tool.name}</h1>
        <p className="hero__body">{props.tool.description}</p>
        {props.tool.configIssues.length > 0 ? (
          <p className="template-warning">{props.tool.configIssues.join(" ")}</p>
        ) : null}
      </div>

      <div className="hero__panel">{props.children}</div>
    </header>
  );
}
