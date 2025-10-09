import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType } from '@xyflow/react';

const LadEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const { whenPrimaryIs, logXptMode, priority, targetDbUniqueName, isEffective } = data;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={{ type: MarkerType.ArrowClosed, color: 'var(--redwood-black)' }}
        style={{
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
          {whenPrimaryIs}: {targetDbUniqueName} {logXptMode} P{priority}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default LadEdge;
