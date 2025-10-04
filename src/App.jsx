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
    data: { dbUniqueName: 'PRIMARY_DB', role: 'PRIMARY', type: 'DATABASE' },
  },
  {
    id: '2',
    type: 'database',
    position: { x: 400, y: 100 },
    data: { dbUniqueName: 'STANDBY_DB', role: 'PHYSICAL_STANDBY', type: 'DATABASE' },
  },
];

const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    sourceHandle: 'rs',
    targetHandle: 'lt',
    type: 'lad',
    data: { logXptMode: 'SYNC', priority: 1 },
  },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [primaryConnections, setPrimaryConnections] = useState({
    '1': [{ target: '2', logXptMode: 'SYNC', priority: 1 }]
  });

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);
  const selectedIsStandby = selectedNode && selectedNode.data.role === 'PHYSICAL_STANDBY';

  const nodesWithWarnings = useMemo(() => {
    return nodes.map(node => {
      const incoming = edges.filter(e => e.target === node.id);
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
  }, [nodes, edges]);

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
    const edge = edges.find(e => e.id === id);
    if (edge) {
      setPrimaryConnections(conns => {
        const source = edge.source;
        return {
          ...conns,
          [source]: conns[source].map(c => c.target === edge.target ? { ...c, ...updates } : c)
        };
      });
    }
  }, [edges, setEdges, setPrimaryConnections]);

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      if (sourceNode.data.type === 'RECOVERY_APPLIANCE') return;
      const newEdge = {
        ...params,
        type: 'lad',
        data: { logXptMode: 'SYNC', priority: 1 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setPrimaryConnections(conns => ({
        ...conns,
        [params.source]: [...(conns[params.source] || []), { target: params.target, logXptMode: 'SYNC', priority: 1 }]
      }));
    },
    [nodes, setEdges, setPrimaryConnections]
  );

  const onNodesDelete = useCallback((deletedNodes) => {
    const deletedIds = deletedNodes.map(n => n.id);
    // Remove connections involving deleted nodes
    setPrimaryConnections(conns => {
      const newConns = {};
      Object.keys(conns).forEach(sourceId => {
        if (!deletedIds.includes(sourceId)) {
          newConns[sourceId] = conns[sourceId].filter(c => !deletedIds.includes(c.target));
        }
      });
      return newConns;
    });
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
  }, [nodes, onUpdateNode, setPrimaryConnections]);

  const onEdgesDelete = useCallback((deletedEdges) => {
    deletedEdges.forEach(edge => {
      setPrimaryConnections(conns => {
        const source = edge.source;
        return {
          ...conns,
          [source]: conns[source].filter(c => c.target !== edge.target)
        };
      });
    });
  }, [setPrimaryConnections]);

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
      data: { logXptMode: 'SYNC', priority: 1 },
    };
    setEdges(eds => [...eds, newEdge]);
    setPrimaryConnections(conns => ({
      ...conns,
      [primary.id]: [...(conns[primary.id] || []), { target: newId, logXptMode: 'SYNC', priority: 1 }]
    }));
  }, [nodes, setNodes, setEdges, setPrimaryConnections]);

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
    const oldPrimaryId = oldPrimary.id;
    onUpdateNode(oldPrimaryId, { role: 'PHYSICAL_STANDBY' });
    onUpdateNode(selectedNode.id, { role: 'PRIMARY' });
    const newPrimaryId = selectedNode.id;
    // Cascade/reverse the connections: old primary's destinations become new primary's destinations, with old primary as target
    const oldConnections = primaryConnections[oldPrimaryId] || [];
    const reversedConnections = oldConnections.map(c => ({
      target: oldPrimaryId,
      logXptMode: c.logXptMode,
      priority: c.priority
    }));
    setPrimaryConnections(conns => ({
      ...conns,
      [newPrimaryId]: reversedConnections
    }));
    const newEdges = reversedConnections.map(c => ({
      id: `e${newPrimaryId}-${c.target}`,
      source: newPrimaryId,
      target: c.target,
      type: 'lad',
      data: c,
    }));
    setEdges(() => newEdges);
  }, [selectedNode, nodes, onUpdateNode, primaryConnections, setPrimaryConnections, setEdges]);

  const onExport = useCallback(() => {
    const data = { nodes, edges, primaryConnections };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topology.json';
    a.click();
  }, [nodes, edges, primaryConnections]);

  const onImport = useCallback((data) => {
    setNodes(data.nodes || []);
    setEdges(data.edges || []);
    setPrimaryConnections(data.primaryConnections || {});
  }, [setNodes, setEdges, setPrimaryConnections]);

  const dgmgrlStatements = useMemo(() => {
    return Object.entries(primaryConnections).map(([primaryId, conns]) => {
      const primary = nodes.find(n => n.id === primaryId);
      if (!primary) return '';
      const routes = conns.map(c => {
        const target = nodes.find(n => n.id === c.target);
        return `${target?.data.dbUniqueName || 'UNKNOWN'} ${c.logXptMode} PRIORITY=${c.priority}`;
      }).join(', ');
      const type = primary.data.type === 'DATABASE' ? 'DATABASE' :
                   primary.data.type === 'FAR_SYNC' ? 'FAR_SYNC' : 'RECOVERY_APPLIANCE';
      return `EDIT ${type} ${primary.data.dbUniqueName} SET PROPERTY RedoRoutes = '${routes}';`;
    }).filter(s => s).join('\n');
  }, [primaryConnections, nodes]);

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
