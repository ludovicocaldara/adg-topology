import { useCallback, useState, useMemo, useEffect } from 'react';
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

// Storage helpers
const setStorage = (name, value) => {
  localStorage.setItem(name, value);
};

const getStorage = (name) => {
  return localStorage.getItem(name);
};

const deleteStorage = (name) => {
  localStorage.removeItem(name);
};

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

// Load from storage if available
const getInitialNodes = () => {
  const saved = getStorage('adgTopologyData');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.nodes && Array.isArray(data.nodes)) return data.nodes;
    } catch (err) {
      console.error('Failed to load nodes from storage:', err);
    }
  }
  return initialNodes;
};

// Load from storage if available
const getInitialEdges = () => {
  const saved = getStorage('adgTopologyData');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.edges && Array.isArray(data.edges)) return data.edges;
    } catch (err) {
      console.error('Failed to load edges from storage:', err);
    }
  }
  return initialEdges;
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(getInitialEdges());
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  // Save to storage when nodes or edges change
  useEffect(() => {
    const data = { nodes, edges };
    setStorage('adgTopologyData', JSON.stringify(data));
  }, [nodes, edges]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);
  const currentPrimary = nodes.find(n => n.data.role === 'PRIMARY');
  const selectedIsStandby = selectedNode && selectedNode.data.role === 'PHYSICAL_STANDBY';

  // return only edges relevant to the current primary vor visualization
  const visibleEdges = useMemo(() => edges.filter(e => e.data.whenPrimaryIs === currentPrimary?.data.dbUniqueName), [edges, currentPrimary]);

  // Map of source node ID to array of { target, whenPrimaryIs, priority }
  // we use this to generate DGMGRL statements
  const allConnections = useMemo(() => {
    const conns = {};
    edges.forEach(edge => {
      if (!conns[edge.source]) conns[edge.source] = [];
      conns[edge.source].push({ target: edge.target, whenPrimaryIs: edge.data.whenPrimaryIs, priority: edge.data.priority });
    });
    return conns;
  }, [edges]);

  // Add warnings to nodes if they are misconfigured
  // e.g. a standby that does not receive from primary
  // or a standby that receives from multiple sources
  // Warnings are shown in the node component
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
    console.log('Node clicked:', node);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    console.log('Edge clicked:', edge);
  }, []);

  // Update node data (e.g. role, dbUniqueName)
  // updates is an object with the fields to update
  // e.g. { role: 'PRIMARY' }
  // We merge the updates into the existing data
  // and update the node in state
  const onUpdateNode = useCallback((id, updates) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [setNodes]);

  // Similar for edges
  const onUpdateEdge = useCallback((id, updates) => {
    setEdges(eds => eds.map(e => e.id === id ? { ...e, data: { ...e.data, ...updates } } : e));
  }, [setEdges]);

  const onConnect = useCallback(
    (params) => {
      console.log('Connecting:', params);
      const currentPrimary = nodes.find(n => n.data.role === 'PRIMARY');
      const targetNode = nodes.find(n => n.id === params.target);
      // Prevent self-connections and connections
      if (params.source === params.target) return;
      const sourceNode = nodes.find(n => n.id === params.source);
      // Prevent connections from recovery appliance
      if (sourceNode.data.type === 'RECOVERY_APPLIANCE') return;
      // Prevent connections to primary
      if (targetNode.data.role === 'PRIMARY') return;
      const newEdge = {
        ...params,
        type: 'lad',
        data: { logXptMode: 'ASYNC', priority: 1, whenPrimaryIs: currentPrimary.data.dbUniqueName, targetDbUniqueName: targetNode?.data.dbUniqueName },
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

  const onClearAll = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    deleteStorage('adgTopologyData');
  }, []);

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
        onClearAll={onClearAll}
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
