import { useCallback, useState, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
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
      if (data.edges && Array.isArray(data.edges)) {
        // Normalize edge data: add missing alternateTo
        return data.edges.map(edge => ({
          ...edge,
          data: {
            ...edge.data,
            alternateTo: edge.data.alternateTo || null,
          }
        }));
      }
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
  const [showRedoRoutesModal, setShowRedoRoutesModal] = useState(false);

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
  const visibleEdges = useMemo(() => {
    const filtered = edges.filter(e => e.data.whenPrimaryIs === currentPrimary?.data.dbUniqueName);
    // Determine effective edges: for each target, the edges with the minimum priority are effective
    const targetMinPriorities = {};
    filtered.forEach(edge => {
      if (!targetMinPriorities[edge.target]) {
        targetMinPriorities[edge.target] = edge.data.priority;
      } else {
        targetMinPriorities[edge.target] = Math.min(targetMinPriorities[edge.target], edge.data.priority);
      }
    });
    return filtered.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isEffective: edge.data.priority === targetMinPriorities[edge.target]
      }
    }));
  }, [edges, currentPrimary]);

  // Map of source node ID to array of edges
  // we use this to generate DGMGRL statements
  const allConnections = useMemo(() => {
    const conns = {};
    edges.forEach(edge => {
      if (!conns[edge.source]) conns[edge.source] = [];
      conns[edge.source].push(edge);
    });
    return conns;
  }, [edges]);

  // Add warnings to nodes if they are misconfigured
  // e.g. a standby that does not receive from primary
  // or a standby that receives from multiple sources
  // Warnings are shown in the node component
  const nodesWithWarnings = useMemo(() => {
    // Detect loops (cycles) in the full edge set
    const findLoopNodes = (edgesList) => {
      const adj = {};
      edgesList.forEach(e => {
        if (!adj[e.source]) adj[e.source] = [];
        adj[e.source].push(e.target);
      });
      const visited = new Set();
      const recStack = new Set();
      const loopNodes = new Set();

      const dfs = (node) => {
        if (recStack.has(node)) {
          // All nodes currently in recStack are part of a loop
          recStack.forEach(n => loopNodes.add(n));
          return;
        }
        if (visited.has(node)) return;
        visited.add(node);
        recStack.add(node);
        (adj[node] || []).forEach(next => dfs(next));
        recStack.delete(node);
      };

      Object.keys(adj).forEach(start => dfs(start));
      return loopNodes;
    };

    const loopNodeIds = findLoopNodes(edges);

    // Count SYNC edges from the primary
    const primaryNode = nodes.find(n => n.data.role === 'PRIMARY');
    const syncCount = edges.filter(e => e.source === primaryNode?.id && e.data.logXptMode !== 'ASYNC').length;

    // Count total destinations from the primary
    const destCount = edges.filter(e => e.source === primaryNode?.id).length;

    return nodes.map(node => {
      const incoming = visibleEdges.filter(e => e.target === node.id);
      const effectiveIncoming = incoming.filter(e => e.data.isEffective);
      let warning = '';

      // Existing warnings for standby/far sync/recovery appliance
      if (node.data.role === 'PHYSICAL_STANDBY' || node.data.type === 'FAR_SYNC' || node.data.type === 'RECOVERY_APPLIANCE') {
        if (effectiveIncoming.length === 0) {
          warning = 'does not receive redo';
        } else if (effectiveIncoming.length > 1) {
          warning = 'cannot receive from multiple sources';
        }
      }

      // Loop detection warning
      if (loopNodeIds.has(node.id)) {
        warning = warning ? `${warning}; loop detected` : 'loop detected';
      }

      // SYNC edge limit warning on primary
      if (node.id === primaryNode?.id && syncCount > 10) {
        warning = warning ? `${warning}; only 10 non-ASYNC destinations are possible` : 'only 10 non-ASYNC destinations are possible';
      }

      // Destination count limit warning on primary
      if (node.id === primaryNode?.id && destCount > 30) {
        warning = warning ? `${warning}; max 30 direct destinations` : 'max 30 direct destinations';
      }

      return { ...node, data: { ...node.data, warning } };
    });
  }, [nodes, visibleEdges, edges]);

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
      // Prevent self-connections
      if (params.source === params.target) return;
      const sourceNode = nodes.find(n => n.id === params.source);
      // Prevent connections from recovery appliance
      if (sourceNode.data.type === 'RECOVERY_APPLIANCE') return;
      // Prevent connections to primary
      if (targetNode.data.role === 'PRIMARY') return;
    const newEdge = {
      ...params,
      // we assign a unique ID to prevent conflicts
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'lad',
      data: { logXptMode: 'ASYNC', priority: 1, whenPrimaryIs: currentPrimary.data.dbUniqueName, targetDbUniqueName: targetNode?.data.dbUniqueName, alternateTo: null },
    };
    console.log('New edge:', newEdge);
      setEdges((eds) => [...eds, newEdge]);
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
      data: { dbUniqueName: `ORCL_${newId.slice(-4)}`, role: 'PHYSICAL_STANDBY', type: 'DATABASE' },
    };
    setNodes(nds => [...nds, newNode]);
    /* This would automatically link the new standby to primary, but we want user to do it manually
    const newEdge = {
      id: `e${primary.id}-${newId}`,
      source: primary.id,
      target: newId,
      type: 'lad',
      data: { logXptMode: 'SYNC', priority: 1, whenPrimaryIs: primary.data.dbUniqueName, targetDbUniqueName: newNode.data.dbUniqueName },
    };
    setEdges(eds => [...eds, newEdge]);
    */
  }, [nodes, setNodes]);

  const onAddFarSync = useCallback(() => {
    const newId = Date.now().toString();
    const newNode = {
      id: newId,
      type: 'database',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 100 },
      data: { dbUniqueName: `FARSYNC_${newId.slice(-4)}`, type: 'FAR_SYNC' },
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes]);

  const onAddRecoveryAppliance = useCallback(() => {
    const newId = Date.now().toString();
    const newNode = {
      id: newId,
      type: 'database',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 200 + 100 },
      data: { dbUniqueName: `ZDLRA_${newId.slice(-4)}`, type: 'RECOVERY_APPLIANCE' },
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
    const normalizedEdges = (data.edges || []).map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        alternateTo: edge.data.alternateTo || null,
      }
    }));
    setNodes(data.nodes || []);
    setEdges(normalizedEdges);
  }, [setNodes, setEdges]);

  const onClearAll = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    deleteStorage('adgTopologyData');
  }, [setEdges, setNodes]);

  const onShowRedoRoutes = useCallback(() => {
    setShowRedoRoutesModal(true);
  }, []);

  // Generate DGMGRL statements for configuring RedoRoutes on each database
  // RedoRoutes define how a database sends redo logs based on which database is currently the primary
  // The format is: EDIT <TYPE> <DB_NAME> SET PROPERTY RedoRoutes = '(PRIMARY1: routes1)(PRIMARY2: routes2)...'
  // Where routes are grouped by chains: alternates are linked to higher priority routes
  const dgmgrlStatements = useMemo(() => {
    return Object.entries(allConnections).map(([sourceId, edgesForSource]) => {
      const source = nodes.find(n => n.id === sourceId);
      if (!source || edgesForSource.length === 0) return '';

      // Group routes into chains
      const chains = [];
      const used = new Set();
      // First, find all priority=1 routes as chain starters
      edgesForSource.filter(r => r.data.priority === 1 && !used.has(r.id)).forEach(start => {
        const chain = [start];
        used.add(start.id);
        // Find alternates (only consider alternates with priority > 1)
        edgesForSource.filter(r => r.data.alternateTo === start.data.targetDbUniqueName && !used.has(r.id) && r.data.priority > 1).forEach(alt => {
          chain.push(alt);
          used.add(alt.id);
        });
        chains.push(chain);
      });

      // Add remaining routes as single-item chains
      edgesForSource.filter(r => !used.has(r.id)).forEach(r => {
        chains.push([r]);
      });

      // Sort chains by the lowest priority in the chain
      chains.sort((a, b) => Math.min(...a.map(r => r.data.priority)) - Math.min(...b.map(r => r.data.priority)));

      // Group edges by whenPrimaryIs: each primary scenario may have different routes for this source
      const groupedByWp = {};
      edgesForSource.forEach(edge => {
        const wp = edge.data.whenPrimaryIs;
        if (!groupedByWp[wp]) groupedByWp[wp] = [];
        groupedByWp[wp].push(edge);
      });

      const routesStr = Object.entries(groupedByWp).map(([wp, edges]) => {
        // Within this primary scenario, group routes into chains where alternates are linked
        // A chain starts with a priority=1 route and includes routes that have alternateTo set to its target
        const chains = [];
        const used = new Set();

        // Identify chains: start with each unused priority=1 route
        edges.filter(r => r.data.priority === 1 && !used.has(r.id)).forEach(start => {
          const chain = [start];
          used.add(start.id);
          // Collect alternates: routes where alternateTo matches this chain's starting target (only if alternate has priority > 1)
          edges.filter(r => r.data.alternateTo === start.data.targetDbUniqueName && !used.has(r.id) && r.data.priority > 1).forEach(alt => {
            chain.push(alt);
            used.add(alt.id);
          });
          chains.push(chain);
        });

        // Collect orphaned routes (priority >1 without valid alternateTo) as single-item chains
        edges.filter(r => !used.has(r.id)).forEach(r => {
          chains.push([r]);
        });

        // Sort chains by minimum priority (highest priority chains first)
        chains.sort((a, b) => Math.min(...a.map(r => r.data.priority)) - Math.min(...b.map(r => r.data.priority)));

        // Generate the routes string for this wp
        const innerStr = chains.map(chain => {
          if (chain.length === 1) {
            const r = chain[0];
            return `${r.data.targetDbUniqueName} ${r.data.logXptMode}`;
          } else {
            const sortedChain = chain.sort((a, b) => a.data.priority - b.data.priority);
            const parts = sortedChain.map(r => `${r.data.targetDbUniqueName} ${r.data.logXptMode} PRIORITY=${r.data.priority}`).join(', ');
            return `(${parts})`;
          }
        }).join(', ');
        return `(${wp}: ${innerStr})`;
      }).join('');

      // Determine the database type for the DGMGRL command
      const type = source.data.type === 'DATABASE' ? 'DATABASE' :
                   source.data.type === 'FAR_SYNC' ? 'FAR_SYNC' : 'RECOVERY_APPLIANCE';
      // Final statement: EDIT TYPE DB_NAME SET PROPERTY RedoRoutes = 'routesStr';
      return `EDIT ${type} ${source.data.dbUniqueName} SET PROPERTY RedoRoutes = '${routesStr}';`;
    }).filter(s => s).join('\n'); // Join statements for different sources with newlines
  }, [allConnections, nodes]);

  return (
    <><h1>Oracle Active Data Guard RedoRoutes Helper</h1>
    This 100% frontend application helps you design Data Guard topologies and generate the necessary DGMGRL statements to configure RedoRoutes for optimal redo transport.<br/>
    <h2>How to use:</h2>
    <div>
    1. Start by adding standby databases, far syncs, and recovery appliances using the toolbox above.<br/>
    2. <b>Important</b>: Click on every database (or Far Sync or ZDLRA) and set their DB_UNIQUE_NAME to match your environment. It will not be possible to change it later!<br/>
    3. Drop the topology by connecting the databases to each other using mouse drag-and-drop. Start from one of the green dots (source) and connect to a database's black dots (target).<br/>
    4. Click on edges (connections) to set properties like LogXptMode, Priority, and Alternate To (this is required when the source has multiple destinations and you need to specify to which of those the current one is alternate).<br/>
    5. Once you complete the topology for one primary database, switch the primary by selecting a standby and clicking "Make Primary" in the toolbox. The visualization will update to show the redo routes for the new primary.<br/>
    6. Once every topology for every potential primary database is complete, click "Show RedoRoutes" to generate the DGMGRL statements needed to configure redo transport routes.<br/>
    7. You can export your topology to a JSON file for later use with this application, or import an existing topology.<br/>
    8. Clear all to start fresh anytime.<br/>
    9. Note: This tool runs entirely in your browser; no data is sent to any server. Data is persisted only in your browser. Clearing the cookies will reset your configuration.<br/>
    10. Enjoy designing your Data Guard topologies with ease! Ideas or issues? Feel free to create issues or pull requests on the GitHub repository: <a href="https://github.com/ludovicocaldara/adg-topology">https://github.com/ludovicocaldara/adg-topology</a><br/>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
        <ActionToolbox
          onAddStandby={onAddStandby}
          onAddFarSync={onAddFarSync}
          onAddRecoveryAppliance={onAddRecoveryAppliance}
          onMakePrimary={onMakePrimary}
          selectedIsStandby={selectedIsStandby}
          onExport={onExport}
          onImport={onImport}
          onClearAll={onClearAll}
          onShowRedoRoutes={onShowRedoRoutes}
          disableAdd={nodes.length >= 127}
          style={{ width: '100%', height: '60px', borderBottom: '1px solid var(--redwood-black)' }} />
        <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 60px)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
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
            edges={edges}
            nodes={nodes}
            style={{ width: '20%', height: '100%', borderLeft: '1px solid var(--redwood-black)' }} />
        </div>
        {showRedoRoutesModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'var(--redwood-white)',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '80vw',
              maxHeight: '80vh',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              <h3>DGMGRL Statements</h3>
              <pre>{dgmgrlStatements}</pre>
              <button onClick={() => setShowRedoRoutesModal(false)}>Close</button>
            </div>
          </div>
        )}
      </div></>
  );
}

export default App;
