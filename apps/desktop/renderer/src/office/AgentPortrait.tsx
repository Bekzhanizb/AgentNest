import type { AgentAppearance } from '@agentnest/core';
import { characterPixels } from '@agentnest/office-scene/character';

export function AgentPortrait({ appearance }: { readonly appearance: AgentAppearance }) {
  return (
    <svg viewBox="0 0 36 40" className="agent-portrait" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <g transform="translate(4 3)">
        {characterPixels(appearance).map(([x, y, width, height, fill], index) => (
          <rect key={index} x={x} y={y} width={width} height={height} fill={fill} />
        ))}
      </g>
    </svg>
  );
}
