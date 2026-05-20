export const normalizeEdges = (edges = []) => {
  return edges.map(edge => ({
    ...edge,
    data: {
      ...edge.data,
      alternateTo: edge.data.alternateTo || null,
    },
  }));
};
