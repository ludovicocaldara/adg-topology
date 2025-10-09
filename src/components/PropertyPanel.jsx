import React from 'react';

const PropertyPanel = ({ selectedNode, selectedEdge, onUpdateNode, onUpdateEdge, edges, nodes, style }) => {
  const defaultStyle = { width: '200px', padding: '10px', border: '1px solid var(--redwood-black)' };
  const combinedStyle = { ...defaultStyle, ...style };

  if (!selectedNode && !selectedEdge) {
    return <div style={combinedStyle}>Select an object</div>;
  }

  if (selectedNode) {
    const { dbUniqueName, role, type } = selectedNode.data;
    return (
      <div style={{ ...combinedStyle, background: 'var(--redwood-white)' }}>
        <h3>Properties</h3>
        <label>DB_UNIQUE_NAME</label>
        <input
          value={dbUniqueName}
          onChange={(e) => onUpdateNode(selectedNode.id, { dbUniqueName: e.target.value })}
          style={{ width: '100%', marginBottom: '10px' }}
        />
        {type === 'DATABASE' && <div>Role: {role}</div>}
      </div>
    );
  }

  if (selectedEdge) {
    const { logXptMode, priority, whenPrimaryIs, alternateTo, targetDbUniqueName } = selectedEdge.data;
    const higherPriorityTargets = edges
      .filter(e => e.data.whenPrimaryIs === whenPrimaryIs && e.data.priority < priority && e.data.targetDbUniqueName !== targetDbUniqueName)
      .map(e => e.data.targetDbUniqueName)
      .filter((v, i, a) => a.indexOf(v) === i); // unique
    return (
      <div style={{ ...combinedStyle, background: 'var(--redwood-white)' }}>
        <h3>Log Archive Dest Properties</h3>
        <p><label style={{ width: '100%', marginBottom: '10px'}} >Valid when Primary is: {whenPrimaryIs}</label></p>
        <label>LogXptMode</label>
        <select
          value={logXptMode}
          onChange={(e) => onUpdateEdge(selectedEdge.id, { logXptMode: e.target.value })}
          style={{ width: '100%', marginBottom: '10px' }}
        >
          <option value="SYNC">SYNC</option>
          <option value="ASYNC">ASYNC</option>
          <option value="FASTSYNC">FASTSYNC</option>
        </select>
        <label>Priority</label>
        <input
          type="number"
          min="1"
          max="8"
          value={priority}
          onChange={(e) => onUpdateEdge(selectedEdge.id, { priority: parseInt(e.target.value) || 1 })}
          style={{ width: '100%', marginBottom: '10px' }}
        />
        {priority > 1 && (
          <>
            <label>Alternate To</label>
            <select
              value={alternateTo || ''}
              onChange={(e) => onUpdateEdge(selectedEdge.id, { alternateTo: e.target.value || null })}
              style={{ width: '100%' }}
            >
              <option value="">None</option>
              {higherPriorityTargets.map(target => (
                <option key={target} value={target}>{target}</option>
              ))}
            </select>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default PropertyPanel;
