import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
} from '@xyflow/react';

import { initialNodes, initialEdges } from '../data/initialTopology';
import { normalizeEdges } from '../utils/edgeNormalization';
import { generateDgmgrlStatements } from '../utils/redoRoutes';
import { deleteStorage, getStorage, setStorage } from '../utils/storage';
import { getVisibleEdges } from '../utils/topologyValidation';
import { useTopologyWarnings } from './useTopologyWarnings';

const STORAGE_KEY = 'adgTopologyData';

const getInitialData = () => {
  const saved = getStorage(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      const nodes = Array.isArray(data.nodes) ? data.nodes : initialNodes;
      const edges = Array.isArray(data.edges) ? normalizeEdges(data.edges, nodes) : initialEdges;
      return { nodes, edges };
    } catch (err) {
      console.error('Failed to load topology from storage:', err);
    }
  }
  return { nodes: initialNodes, edges: initialEdges };
};

const initialData = getInitialData();

export const useTopologyState = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [showRedoRoutesModal, setShowRedoRoutesModal] = useState(false);

  useEffect(() => {
    setStorage(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);
  const currentPrimary = nodes.find(n => n.data.role === 'PRIMARY');
  const selectedIsStandby = selectedNode && selectedNode.data.role === 'PHYSICAL_STANDBY';

  const visibleEdges = useMemo(() => getVisibleEdges(edges, currentPrimary, nodes), [edges, currentPrimary, nodes]);
  const nodesWithWarnings = useTopologyWarnings(nodes, visibleEdges);
  const dgmgrlStatements = useMemo(() => generateDgmgrlStatements(nodes, edges), [nodes, edges]);

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

  const onUpdateNode = useCallback((id, updates) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [setNodes]);

  const onUpdateEdge = useCallback((id, updates) => {
    setEdges(eds => eds.map(e => e.id === id ? { ...e, data: { ...e.data, ...updates } } : e));
  }, [setEdges]);

  const onConnect = useCallback(
    (params) => {
      console.log('Connecting:', params);
      const currentPrimary = nodes.find(n => n.data.role === 'PRIMARY');
      const targetNode = nodes.find(n => n.id === params.target);
      const sourceNode = nodes.find(n => n.id === params.source);

      if (params.source === params.target) return;
      if (sourceNode.data.type === 'RECOVERY_APPLIANCE') return;
      if (targetNode.data.role === 'PRIMARY') return;

      const newEdge = {
        ...params,
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'lad',
        data: {
          logXptMode: 'ASYNC',
          priority: 1,
          whenPrimaryNodeId: currentPrimary.id,
          alternateToNodeId: null,
        },
      };

      console.log('New edge:', newEdge);
      setEdges((eds) => [...eds, newEdge]);
    },
    [nodes, setEdges]
  );

  const onNodesDelete = useCallback((deletedNodes) => {
    const deletedIds = deletedNodes.map(n => n.id);
    const primaries = nodes.filter(n => n.data.role === 'PRIMARY' && !deletedIds.includes(n.id));

    if (primaries.length === 0) {
      const standbys = nodes.filter(n => !deletedIds.includes(n.id) && n.data.type === 'DATABASE');
      if (standbys.length > 0) {
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
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topology.json';
    a.click();
  }, [nodes, edges]);

  const onImport = useCallback((data) => {
    const importedNodes = data.nodes || [];
    setNodes(importedNodes);
    setEdges(normalizeEdges(data.edges || [], importedNodes));
  }, [setNodes, setEdges]);

  const onClearAll = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    deleteStorage(STORAGE_KEY);
  }, [setEdges, setNodes]);

  return {
    nodes,
    nodesWithWarnings,
    edges,
    visibleEdges,
    selectedNode,
    selectedEdge,
    selectedIsStandby,
    showRedoRoutesModal,
    dgmgrlStatements,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onEdgeClick,
    onNodesDelete,
    onEdgesDelete,
    onUpdateNode,
    onUpdateEdge,
    onAddStandby,
    onAddFarSync,
    onAddRecoveryAppliance,
    onMakePrimary,
    onExport,
    onImport,
    onClearAll,
    showRedoRoutes: () => setShowRedoRoutesModal(true),
    hideRedoRoutes: () => setShowRedoRoutesModal(false),
  };
};
