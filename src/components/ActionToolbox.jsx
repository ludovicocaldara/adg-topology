import React from 'react';

const ActionToolbox = ({ onAddStandby, onAddFarSync, onAddRecoveryAppliance, onMakePrimary, selectedIsStandby, onExport, onImport, style }) => {
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          onImport(data);
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const defaultStyle = { width: '200px', padding: '10px', border: '1px solid var(--redwood-black)', background: 'var(--redwood-white)' };
  const combinedStyle = { ...defaultStyle, ...style };

  return (
    <div style={combinedStyle}>
      <h3 style={{ margin: 0 }}>Actions</h3>
      <button onClick={onAddStandby}>Add Standby</button>
      <button onClick={onAddFarSync}>Add Far Sync</button>
      <button onClick={onAddRecoveryAppliance}>Add Recovery Appliance</button>
      <button onClick={onMakePrimary} disabled={!selectedIsStandby}>Make Primary</button>
      <button onClick={onExport}>Export JSON</button>
      <input type="file" accept=".json" onChange={handleImport} />
    </div>
  );
};

export default ActionToolbox;
