const findNodeIdByDbUniqueName = (nodes, dbUniqueName) => (
  nodes.find(node => node.data.dbUniqueName === dbUniqueName)?.id
);

export const normalizeEdges = (edges = [], nodes = []) => {
  return edges.map(edge => {
    const data = { ...edge.data };
    const legacyWhenPrimaryIs = data.whenPrimaryIs;
    const legacyAlternateTo = data.alternateTo;
    delete data.whenPrimaryIs;
    delete data.targetDbUniqueName;
    delete data.alternateTo;

    return {
      ...edge,
      data: {
        ...data,
        whenPrimaryNodeId: data.whenPrimaryNodeId || findNodeIdByDbUniqueName(nodes, legacyWhenPrimaryIs) || null,
        alternateToNodeId: data.alternateToNodeId || findNodeIdByDbUniqueName(nodes, legacyAlternateTo) || null,
      },
    };
  });
};
