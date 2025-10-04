import React, { memo } from 'react';
import { getEdgeCenter, Handle, Position } from '@xyflow/react';

const DatabaseNode = ({ data, selected }) => {
  const { dbUniqueName, role, type, warning } = data;
  let bgColor = 'var(--redwood-blue)';
  if (role === 'PRIMARY') bgColor = 'var(--redwood-red)';
  if (type === 'FAR_SYNC' || type === 'RECOVERY_APPLIANCE') bgColor = 'var(--redwood-grey)';

  return (
    <div 
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
      {warning && <div style={{ color: 'red', fontSize: '10px', marginTop: '5px' }}>{warning}</div>}
      <Handle type="source" position={Position.Right} id='rs' style={{ top: 'calc(50% - 5px)', background: 'green'}} isConnectable={true} />
      <Handle type="target" position={Position.Right} id='rt' style={{ top: 'calc(50% + 5px)' }} isConnectableStart={false} isConnectable={true} />
      <Handle type="source" position={Position.Left} id='ls' style={{ top: 'calc(50% + 5px)', background: 'green' }} isConnectable={true} />
      <Handle type="target" position={Position.Left} id='lt' style={{ top: 'calc(50% - 5px)' }} isConnectableStart={false} isConnectable={true} />
      <Handle type="source" position={Position.Top} id='ts' style={{ left: 'calc(50% - 5px)', background: 'green'}} isConnectable={true} />
      <Handle type="target" position={Position.Top} id='tt' style={{ left: 'calc(50% + 5px)' }} isConnectableStart={false} isConnectable={true} />
      <Handle type="source" position={Position.Bottom} id='bs' style={{ left: 'calc(50% + 5px)', background: 'green' }} isConnectable={true} />
      <Handle type="target" position={Position.Bottom} id='bt' style={{ left: 'calc(50% - 5px)' }} isConnectableStart={false} isConnectable={true} />
    </div>
  );
};

export default memo(DatabaseNode);
