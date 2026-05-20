import React from 'react';
import { BaseEdge, EdgeLabelRenderer, useStore } from '@xyflow/react';

const getNodeCenter = (node) => {
  if (!node) return null;

  const width = node.measured?.width ?? node.width ?? node.initialWidth ?? 0;
  const height = node.measured?.height ?? node.height ?? node.initialHeight ?? 0;
  const position = node.internals?.positionAbsolute ?? node.position ?? { x: 0, y: 0 };

  return {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };
};

const LadEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) => {
  const sourceNode = useStore((store) => store.nodeLookup.get(source));
  const targetNode = useStore((store) => store.nodeLookup.get(target));
  const { whenPrimaryName, logXptMode, priority, targetDbUniqueName, isEffective } = data;
  const markerId = `lad-arrow-${id}`;
  const sourceCenter = getNodeCenter(sourceNode) ?? { x: sourceX, y: sourceY };
  const targetCenter = getNodeCenter(targetNode) ?? { x: targetX, y: targetY };
  const labelX = (sourceCenter.x + targetCenter.x) / 2;
  const labelY = (sourceCenter.y + targetCenter.y) / 2;
  const arrowX = sourceCenter.x + (targetCenter.x - sourceCenter.x) * 0.62;
  const arrowY = sourceCenter.y + (targetCenter.y - sourceCenter.y) * 0.62;
  const edgePath = `M ${sourceCenter.x},${sourceCenter.y} L ${arrowX},${arrowY} L ${targetCenter.x},${targetCenter.y}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerHeight="8"
          markerUnits="strokeWidth"
          markerWidth="10"
          orient="auto-start-reverse"
          refX="5"
          refY="4"
          viewBox="0 0 10 8"
        >
          <path d="M 0 0 L 10 4 L 0 8 z" fill="var(--redwood-black)" />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        markerMid={`url(#${markerId})`}
        style={{
          stroke: 'var(--redwood-black)',
          strokeWidth: 1.5,
          strokeDasharray: isEffective ? 'none' : '5,5',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            pointerEvents: 'all',
            background: 'var(--redwood-white)',
            padding: '2px 4px',
            borderRadius: '3px',
            border: '1px solid var(--redwood-black)',
          }}
          className="nodrag nopan"
        >
          {whenPrimaryName}: {targetDbUniqueName} {logXptMode} P{priority}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default LadEdge;
