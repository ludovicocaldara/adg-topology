const HelpText = () => {
  return (
    <>
      <h1>ADG-Topology - RedoRoutes Helper</h1>
      This 100% frontend application helps you design Data Guard topologies and generate the necessary DGMGRL statements to configure RedoRoutes for optimal redo transport.<br/>
      <h2>How to use:</h2>
      <div>
        1. Start by adding standby databases, far syncs, and recovery appliances using the toolbox above.<br/>
        2. Click on every database (or Far Sync or ZDLRA) and set their DB_UNIQUE_NAME to match your environment. You can still rename members after creating connections.<br/>
        3. Draw the topology by connecting the databases to each other using mouse drag-and-drop. Start from one of the green dots (source) and connect to a database's black dots (target).<br/>
        4. Click on edges (connections) to set properties like LogXptMode, Priority, and Alternate To (this is required when the source has multiple destinations and you need to specify to which of those the current one is alternate).<br/>
        5. Once you complete the topology for one primary database, switch the primary by selecting a standby and clicking "Make Primary" in the toolbox. The visualization will update to show the redo routes for the new primary.<br/>
        6. Once every topology for every potential primary database is complete, click "Show RedoRoutes" to generate the DGMGRL statements needed to configure redo transport routes.<br/>
        7. You can export your topology to a JSON file for later use with this application, or import an existing topology.<br/>
        8. Clear all to start fresh anytime.<br/>
        9. Note: This tool runs entirely in your browser; no data is sent to any server. Data is persisted only in your browser. Clearing the cookies will reset your configuration.<br/>
        10. Enjoy designing your Data Guard topologies with ease! Ideas or issues? Feel free to create issues or pull requests on the GitHub repository: <a href="https://github.com/ludovicocaldara/adg-topology">https://github.com/ludovicocaldara/adg-topology</a><br/>
      </div>
    </>
  );
};

export default HelpText;
