import '@xyflow/react/dist/style.css';

import ActionToolbox from './components/ActionToolbox';
import HelpText from './components/HelpText';
import RedoRoutesModal from './components/RedoRoutesModal';
import TopologyCanvas from './components/TopologyCanvas';
import { useTopologyState } from './hooks/useTopologyState';

function App() {
  const topology = useTopologyState();

  return (
    <>
      <HelpText />
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
        <ActionToolbox
          onAddStandby={topology.onAddStandby}
          onAddFarSync={topology.onAddFarSync}
          onAddRecoveryAppliance={topology.onAddRecoveryAppliance}
          onMakePrimary={topology.onMakePrimary}
          selectedIsStandby={topology.selectedIsStandby}
          onExport={topology.onExport}
          onImport={topology.onImport}
          onClearAll={topology.onClearAll}
          onShowRedoRoutes={topology.showRedoRoutes}
          disableAdd={topology.nodes.length >= 127}
          style={{ width: '100%', height: '60px', borderBottom: '1px solid var(--redwood-black)' }}
        />
        <TopologyCanvas
          nodes={topology.nodesWithWarnings}
          edges={topology.visibleEdges}
          allEdges={topology.edges}
          selectedNode={topology.selectedNode}
          selectedEdge={topology.selectedEdge}
          onNodesChange={topology.onNodesChange}
          onEdgesChange={topology.onEdgesChange}
          onConnect={topology.onConnect}
          onNodeClick={topology.onNodeClick}
          onEdgeClick={topology.onEdgeClick}
          onNodesDelete={topology.onNodesDelete}
          onEdgesDelete={topology.onEdgesDelete}
          onUpdateNode={topology.onUpdateNode}
          onUpdateEdge={topology.onUpdateEdge}
        />
        {topology.showRedoRoutesModal && (
          <RedoRoutesModal
            statements={topology.dgmgrlStatements}
            onClose={topology.hideRedoRoutes}
          />
        )}
      </div>
    </>
  );
}

export default App;
