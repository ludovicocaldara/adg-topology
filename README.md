# ADG Topology Designer

A frontend-only React application for designing Oracle Data Guard topologies visually using React Flow.

## Features

- Visual design of Oracle Data Guard configurations
- Support for databases (primary/standby), far sync instances, and recovery appliances
- Log Archive Destination (LAD) connections with configurable properties
- Automatic generation of DGMGRL statements for broker configuration
- Export and import of topology configurations as JSON
- Real-time validation with warnings and errors

## Color Scheme

- Primary Database: Redwood Red (#B84F3C)
- Standby Databases: Redwood Blue (#375865)
- Far Sync / Recovery Appliance: Redwood Grey (#8A8580)
- Foreground/Text: Redwood Black (#312D2B)
- Background: Redwood White (#FCFBFA)

## Font

- Oracle Sans (fallback: Haas Unica)

## Usage

- Start with a primary database and a standby database connected
- Use the action toolbox to add more standby databases
- Drag from database handles to create LAD connections
- Select nodes or edges to edit properties in the panel
- Switch primary databases using the "Make Primary" action
- Export/import configurations as JSON
- View generated DGMGRL statements at the bottom

## Development

Built with React 19 and Vite, using @xyflow/react for the flow diagram.
