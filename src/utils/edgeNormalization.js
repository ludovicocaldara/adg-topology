const findNodeIdByDbUniqueName = (nodes, dbUniqueName) => (
  nodes.find(node => node.data.dbUniqueName === dbUniqueName)?.id
);

const legacyHandleSides = {
  bs: 'bottom',
  bt: 'bottom',
  ls: 'left',
  lt: 'left',
  rs: 'right',
  rt: 'right',
  ts: 'top',
  tt: 'top',
};

const normalizeHandleId = (handleId) => legacyHandleSides[handleId] || handleId;

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
      sourceHandle: normalizeHandleId(edge.sourceHandle),
      targetHandle: normalizeHandleId(edge.targetHandle),
      data: {
        ...data,
        whenPrimaryNodeId: data.whenPrimaryNodeId || findNodeIdByDbUniqueName(nodes, legacyWhenPrimaryIs) || null,
        alternateToNodeId: data.alternateToNodeId || findNodeIdByDbUniqueName(nodes, legacyAlternateTo) || null,
      },
    };
  });
};
