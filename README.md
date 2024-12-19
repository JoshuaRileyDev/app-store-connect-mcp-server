# App Store Connect MCP Server

A Model Context Protocol (MCP) server for interacting with the App Store Connect API. This server provides tools for managing apps, beta testers, bundle IDs, devices, and capabilities in App Store Connect.

## Features

- **App Management**
  - List all apps
  - Get detailed app information
  - View app metadata and relationships

- **Beta Testing**
  - List beta groups
  - List beta testers
  - Add/remove testers from groups
  - Manage beta test configurations

- **Bundle ID Management**
  - List bundle IDs
  - Create new bundle IDs
  - Get bundle ID details
  - Enable/disable capabilities

- **Device Management**
  - List registered devices
  - Filter by device type, platform, status
  - View device details

- **User Management**
  - List team members
  - View user roles and permissions
  - Filter users by role and access

## Installation

```bash
npm install @your-org/app-store-connect-mcp-server
```

## Configuration

Add the following to your Claude Desktop configuration file:

### macOS
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Windows
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "app-store-connect": {
      "command": "npx",
      "args": [
        "-y",
        "@your-org/app-store-connect-mcp-server"
      ],
      "env": {
        "APP_STORE_CONNECT_KEY_ID": "YOUR_KEY_ID",
        "APP_STORE_CONNECT_ISSUER_ID": "YOUR_ISSUER_ID",
        "APP_STORE_CONNECT_P8_PATH": "/path/to/your/auth-key.p8"
      }
    }
  }
}
```

## Authentication

1. Generate an App Store Connect API Key from [App Store Connect](https://appstoreconnect.apple.com/access/api)
2. Download the .p8 private key file
3. Note your Key ID and Issuer ID
4. Set the environment variables in your configuration

## Available Tools

### App Management
- `list_apps`: Get a list of all apps in App Store Connect
- `get_app_info`: Get detailed information about a specific app

### Beta Testing
- `list_beta_groups`: List all beta testing groups
- `list_group_testers`: List testers in a specific beta group
- `add_tester_to_group`: Add a new tester to a beta group
- `remove_tester_from_group`: Remove a tester from a beta group

### Bundle ID Management
- `list_bundle_ids`: List all registered bundle IDs
- `create_bundle_id`: Register a new bundle ID
- `get_bundle_id_info`: Get detailed bundle ID information
- `enable_bundle_capability`: Enable a capability for a bundle ID
- `disable_bundle_capability`: Disable a capability for a bundle ID

### Device Management
- `list_devices`: List all registered devices with filtering options

### User Management
- `list_users`: List all team members with role filtering

## Error Handling

The server implements proper error handling for:
- Invalid authentication
- Missing required parameters
- API rate limits
- Network issues
- Invalid operations

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run type checking
npm run type-check
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Related Links
- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [App Store Connect API Documentation](https://developer.apple.com/documentation/appstoreconnectapi)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)