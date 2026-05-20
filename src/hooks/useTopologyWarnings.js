import { useMemo } from 'react';

import { addTopologyWarnings } from '../utils/topologyValidation';

export const useTopologyWarnings = (nodes, visibleEdges) => {
  return useMemo(() => addTopologyWarnings(nodes, visibleEdges), [nodes, visibleEdges]);
};
