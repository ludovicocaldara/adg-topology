import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const perimeterHandles = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
];

const DatabaseNode = ({ data, selected }) => {
  const { dbUniqueName, role, type, warning } = data;
  let bgColor = 'var(--redwood-blue)';
  if (role === 'PRIMARY') bgColor = 'var(--redwood-red)';
  if (type === 'FAR_SYNC' || type === 'RECOVERY_APPLIANCE') bgColor = 'var(--redwood-grey)';

  return (
    <div 
      className={`database-node ${selected ? 'database-node--selected' : ''}`}
      style={{
        padding: '15px',
        borderRadius: '5px',
        backgroundColor: bgColor,
        color: 'var(--redwood-white)',
        border: selected ? '2px solid var(--redwood-black)' : '1px solid var(--redwood-black)',
        minWidth: '120px',
        textAlign: 'center',
        position: 'relative',
        fontSize: '15px',
      }}
    >
      <div style={{ fontSize: '10px', marginBottom: '5px' }}>Type: {type}</div>
      {type == "DATABASE" && <div style={{ fontSize: '10px', marginBottom: '5px' }}>Role: {role}</div>}
      <div>{dbUniqueName}</div>
      {warning && <div style={{ color: 'yellow', fontSize: '10px', marginTop: '5px' }}>WARNING: {warning}</div>}
      {perimeterHandles.map(({ id, position }) => (
        <Handle
          key={id}
          type="source"
          position={position}
          id={id}
          className={`database-node__handle database-node__handle--${id}`}
          isConnectable={true}
        />
      ))}
    </div>
  );
};

export default memo(DatabaseNode);
