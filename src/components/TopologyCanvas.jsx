import {
  ReactFlow,
  Controls,
  Background,
} from '@xyflow/react';

import DatabaseNode from './DatabaseNode';
import LadEdge from './LadEdge';
import PropertyPanel from './PropertyPanel';

const nodeTypes = {
  database: DatabaseNode,
};

const edgeTypes = {
  lad: LadEdge,
};

const TopologyCanvas = ({
  nodes,
  edges,
  allEdges,
  selectedNode,
  selectedEdge,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onNodesDelete,
  onEdgesDelete,
  onUpdateNode,
  onUpdateEdge,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 60px)' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode="loose"
          fitView
        >
          <Controls />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>
      <PropertyPanel
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onUpdateNode={onUpdateNode}
        onUpdateEdge={onUpdateEdge}
        edges={allEdges}
        nodes={nodes}
        style={{ width: '20%', height: '100%', borderLeft: '1px solid var(--redwood-black)' }}
      />
    </div>
  );
};

export default TopologyCanvas;
