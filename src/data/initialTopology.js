export const initialNodes = [
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

export const initialEdges = [];
