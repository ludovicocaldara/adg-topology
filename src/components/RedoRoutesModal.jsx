const RedoRoutesModal = ({ statements, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--redwood-white)',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '80vw',
        maxHeight: '80vh',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        <h3>DGMGRL Statements</h3>
        <pre>{statements}</pre>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default RedoRoutesModal;
