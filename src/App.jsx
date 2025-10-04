import { useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import DatabaseNode from './components/DatabaseNode';
import LadEdge from './components/LadEdge';
import PropertyPanel from './components/PropertyPanel';
import ActionToolbox from './components/ActionToolbox';

const nodeTypes = {
  database: DatabaseNode,
};

const edgeTypes = {
  lad: LadEdge,
};

const initialNodes = [
  {
    id: '1',
    type: 'database',
    position: { x: 100, y: 100 },
    data: { dbUniqueName: 'ORCL_SITE1', role: 'PRIMARY', type: 'DATABASE' },
  },
  {
    id: '2',
    type: 'database',
    position: { x: 400, y: 100 },
    data: { dbUniqueName: 'ORCL_SITE2', role: 'PHYSICAL_STANDBY', type: 'DATABASE' },
  },
];

const initialEdges = [];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);
  const currentPrimary = nodes.find(n => n.data.role === 'PRIMARY');
  const selectedIsStandby = selectedNode && selectedNode.data.role === 'PHYSICAL_STANDBY';

  const visibleEdges = useMemo(() => edges.filter(e => e.data.whenPrimaryIs === currentPrimary?.data.dbUniqueName), [edges, currentPrimary]);

  const primaryConnections = useMemo(() => {
    const conns = {};
    visibleEdges.forEach(edge => {
      if (!conns[edge.source]) conns[edge.source] = [];
      conns[edge.source].push({ target: edge.target, logXptMode: edge.data.logXptMode, priority: edge.data.priority });
    });
    return conns;
  }, [visibleEdges]);

  const allConnections = useMemo(() => {
    const conns = {};
    edges.forEach(edge => {
      if (!conns[edge.source]) conns[edge.source] = [];
      conns[edge.source].push({ target: edge.target, whenPrimaryIs: edge.data.whenPrimaryIs, priority: edge.data.priority });
    });
    return conns;
  }, [edges]);

  const nodesWithWarnings = useMemo(() => {
    return nodes.map(node => {
      const incoming = visibleEdges.filter(e => e.target === node.id);
      let warning = '';
      if (node.data.role === 'PHYSICAL_STANDBY' || node.data.type === 'FAR_SYNC' || node.data.type === 'RECOVERY_APPLIANCE') {
        if (incoming.length === 0) {
          warning = 'does not receive redo';
        } else if (incoming.length > 1) {
          warning = 'cannot receive from multiple sources';
        }
      }
      return { ...node, data: { ...node.data, warning } };
    });
  }, [nodes, visibleEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onUpdateNode = useCallback((id, updates) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [setNodes]);

  const onUpdateEdge = useCallback((id, updates) => {
    setEdges(eds => eds.map(e => e.id === id ? { ...e, data: { ...e.data, ...updates } } : e));
  }, [setEdges]);

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      if (sourceNode.data.type === 'RECOVERY_APPLIANCE') return;
      const currentPrimary = nodes.find(n => n.data.role === 'PRIMARY');
      const targetNode = nodes.find(n => n.id === params.target);
      const newEdge = {
        ...params,
        type: 'lad',
        data: { logXptMode: 'SYNC', priority: 1, whenPrimaryIs: currentPrimary.data.dbUniqueName, targetDbUniqueName: targetNode?.data.dbUniqueName },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, setEdges]
  );

  const onNodesDelete = useCallback((deletedNodes) => {
    const deletedIds = deletedNodes.map(n => n.id);
    // If a primary is deleted, select another primary in order of creation
    const primaries = nodes.filter(n => n.data.role === 'PRIMARY' && !deletedIds.includes(n.id));
    if (primaries.length === 0) {
      const standbys = nodes.filter(n => !deletedIds.includes(n.id) && n.data.type === 'DATABASE');
      if (standbys.length > 0) {
        // Sort by id (creation order)
        standbys.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        onUpdateNode(standbys[0].id, { role: 'PRIMARY' });
      }
    }
  }, [nodes, onUpdateNode]);

  const onEdgesDelete = useCallback(() => {}, []);

  const onAddStandby = useCallback(() => {
    const primary = nodes.find(n => n.data.role === 'PRIMARY');
    if (!primary) return;
    const newId = Date.now().toString();
    const newNode = {
      id: newId,
      type: 'database',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 100 },
      data: { dbUniqueName: `STANDBY_${newId.slice(-4)}`, role: 'PHYSICAL_STANDBY', type: 'DATABASE' },
    };
    setNodes(nds => [...nds, newNode]);
    const newEdge = {
      id: `e${primary.id}-${newId}`,
      source: primary.id,
      target: newId,
      type: 'lad',
      data: { logXptMode: 'SYNC', priority: 1, whenPrimaryIs: primary.data.dbUniqueName, targetDbUniqueName: newNode.data.dbUniqueName },
    };
    setEdges(eds => [...eds, newEdge]);
  }, [nodes, setNodes, setEdges]);

  const onAddFarSync = useCallback(() => {
    const newId = Date.now().toString();
    const newNode = {
      id: newId,
      type: 'database',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 100 },
      data: { dbUniqueName: `FAR_SYNC_${newId.slice(-4)}`, type: 'FAR_SYNC' },
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes]);

  const onAddRecoveryAppliance = useCallback(() => {
    const newId = Date.now().toString();
    const newNode = {
      id: newId,
      type: 'database',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 100 },
      data: { dbUniqueName: `RECOVERY_APPLIANCE_${newId.slice(-4)}`, type: 'RECOVERY_APPLIANCE' },
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes]);

  const onMakePrimary = useCallback(() => {
    if (!selectedNode || selectedNode.data.role === 'PRIMARY') return;
    const oldPrimary = nodes.find(n => n.data.role === 'PRIMARY');
    if (!oldPrimary) return;
    onUpdateNode(oldPrimary.id, { role: 'PHYSICAL_STANDBY' });
    onUpdateNode(selectedNode.id, { role: 'PRIMARY' });
  }, [selectedNode, nodes, onUpdateNode]);

  const onExport = useCallback(() => {
    const data = { nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topology.json';
    a.click();
  }, [nodes, edges]);

  const onImport = useCallback((data) => {
    setNodes(data.nodes || []);
    setEdges(data.edges || []);
  }, [setNodes, setEdges]);

  const dgmgrlStatements = useMemo(() => {
    return Object.entries(allConnections).map(([sourceId, conns]) => {
      const source = nodes.find(n => n.id === sourceId);
      if (!source) return '';
      const routes = conns.map(c => {
        const target = nodes.find(n => n.id === c.target);
        return `(${c.whenPrimaryIs}: ${target?.data.dbUniqueName || 'UNKNOWN'} PRIORITY=${c.priority})`;
      }).join(' ');
      const type = source.data.type === 'DATABASE' ? 'DATABASE' :
                   source.data.type === 'FAR_SYNC' ? 'FAR_SYNC' : 'RECOVERY_APPLIANCE';
      return `EDIT ${type} ${source.data.dbUniqueName} SET PROPERTY RedoRoutes = '${routes}';`;
    }).filter(s => s).join('\n');
  }, [allConnections, nodes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ActionToolbox
        onAddStandby={onAddStandby}
        onAddFarSync={onAddFarSync}
        onAddRecoveryAppliance={onAddRecoveryAppliance}
        onMakePrimary={onMakePrimary}
        selectedIsStandby={selectedIsStandby}
        onExport={onExport}
        onImport={onImport}
        style={{ width: '100%', height: '60px', borderBottom: '1px solid var(--redwood-black)' }}
      />
      <div style={{ width: '100vw', height: '100vh' , position: 'relative' }}>
          <ReactFlow
            nodes={nodesWithWarnings}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
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
        style={{ width: '100%', height: '200px', borderTop: '1px solid var(--redwood-black)', borderRight: 'none', borderLeft: 'none' }}
      />
      <div style={{
        height: '150px',
        background: 'var(--redwood-white)',
        borderTop: '1px solid var(--redwood-black)',
        padding: '10px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        <h4>DGMGRL Statements:</h4>
        <pre>{dgmgrlStatements}</pre>
      </div>
    </div>
  );
}

export default App;
