const groupEdgesByPrimary = (edgesForSource) => {
  const groupedByPrimary = {};
  edgesForSource.forEach(edge => {
    const whenPrimaryNodeId = edge.data.whenPrimaryNodeId;
    if (!groupedByPrimary[whenPrimaryNodeId]) groupedByPrimary[whenPrimaryNodeId] = [];
    groupedByPrimary[whenPrimaryNodeId].push(edge);
  });
  return groupedByPrimary;
};

const buildRouteChains = (edges) => {
  const chains = [];
  const used = new Set();

  edges.filter(r => r.data.priority === 1 && !used.has(r.id)).forEach(start => {
    const chain = [start];
    used.add(start.id);

    edges.filter(r => r.data.alternateToNodeId === start.target && !used.has(r.id) && r.data.priority > 1).forEach(alt => {
      chain.push(alt);
      used.add(alt.id);
    });

    chains.push(chain);
  });

  edges.filter(r => !used.has(r.id)).forEach(r => {
    chains.push([r]);
  });

  return chains.sort((a, b) => Math.min(...a.map(r => r.data.priority)) - Math.min(...b.map(r => r.data.priority)));
};

const formatRouteChain = (chain, nodesById) => {
  if (chain.length === 1) {
    const route = chain[0];
    return `${nodesById[route.target]?.data.dbUniqueName} ${route.data.logXptMode}`;
  }

  const parts = [...chain]
    .sort((a, b) => a.data.priority - b.data.priority)
    .map(route => `${nodesById[route.target]?.data.dbUniqueName} ${route.data.logXptMode} PRIORITY=${route.data.priority}`)
    .join(', ');

  return `(${parts})`;
};

const getBrokerObjectType = (node) => {
  if (node.data.type === 'DATABASE') return 'DATABASE';
  if (node.data.type === 'FAR_SYNC') return 'FAR_SYNC';
  return 'RECOVERY_APPLIANCE';
};

export const groupConnectionsBySource = (edges) => {
  const connections = {};
  edges.forEach(edge => {
    if (!connections[edge.source]) connections[edge.source] = [];
    connections[edge.source].push(edge);
  });
  return connections;
};

export const generateDgmgrlStatements = (nodes, edges) => {
  const nodesById = Object.fromEntries(nodes.map(node => [node.id, node]));
  const allConnections = groupConnectionsBySource(edges);

  return Object.entries(allConnections).map(([sourceId, edgesForSource]) => {
    const source = nodesById[sourceId];
    if (!source || edgesForSource.length === 0) return '';

    const routesStr = Object.entries(groupEdgesByPrimary(edgesForSource)).map(([whenPrimaryNodeId, primaryEdges]) => {
      const whenPrimaryIs = nodesById[whenPrimaryNodeId]?.data.dbUniqueName;
      if (!whenPrimaryIs) return '';

      const innerStr = buildRouteChains(primaryEdges).map(chain => formatRouteChain(chain, nodesById)).join(', ');
      return `(${whenPrimaryIs}: ${innerStr})`;
    }).filter(Boolean).join('');

    return `EDIT ${getBrokerObjectType(source)} ${source.data.dbUniqueName} SET PROPERTY RedoRoutes = '${routesStr}';`;
  }).filter(Boolean).join('\n');
};
