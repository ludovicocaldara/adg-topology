import { useState } from 'react';

const RedoRoutesModal = ({ statements, onClose }) => {
  const [copyStatus, setCopyStatus] = useState('idle');

  const copyStatements = async () => {
    try {
      await navigator.clipboard.writeText(statements);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };

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
        width: '80vw',
        maxWidth: '80vw',
        maxHeight: '80vh',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        <div style={{
          alignItems: 'center',
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <h3 style={{ margin: 0 }}>DGMGRL Statements</h3>
          <button onClick={copyStatements}>
            {copyStatus === 'copied' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{
          background: '#F1EFED',
          border: '1px solid var(--redwood-grey)',
          borderRadius: '4px',
          boxSizing: 'border-box',
          margin: '0 0 16px',
          maxWidth: '100%',
          overflowX: 'scroll',
          padding: '12px',
          whiteSpace: 'pre',
        }}>{statements}</pre>
        {copyStatus === 'error' && (
          <div style={{
            color: 'var(--redwood-red)',
            marginBottom: '12px',
          }}>
            Unable to copy to clipboard.
          </div>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default RedoRoutesModal;
