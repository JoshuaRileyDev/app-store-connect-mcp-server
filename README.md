# App Store Connect MCP Server

A Model Context Protocol (MCP) server for interacting with the App Store Connect API. This server provides tools for managing apps, beta testers, bundle IDs, devices, and capabilities in App Store Connect.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=app-store-connect&config=JTdCJTIyY29tbWFuZCUyMiUzQSUyMm5weCUyMC15JTIwYXBwc3RvcmUtY29ubmVjdC1tY3Atc2VydmVyJTIyJTdE)

## Overview

The App Store Connect MCP Server is a comprehensive tool that bridges the gap between A.I and Apple's App Store Connect ecosystem. Built on the Model Context Protocol (MCP), this server enables developers to interact with their App Store Connect data directly through conversational AI, making app management, beta testing, and analytics more accessible than ever.

**Key Benefits:**
- 🤖 **AI-Powered App Management**: Use natural language to manage your iOS and macOS apps
- 📊 **Comprehensive Analytics**: Access detailed app performance, sales, and user engagement data
- 👥 **Streamlined Beta Testing**: Efficiently manage beta groups and testers
- 🔧 **Developer Tools Integration**: List Xcode project schemes and integrate with development workflows
- 🔐 **Secure Authentication**: Uses official App Store Connect API with JWT authentication
- 🚀 **Real-time Data**: Access up-to-date information directly from Apple's systems

**Who This Is For:**
- iOS/macOS developers managing apps in App Store Connect
- Development teams coordinating beta testing programs
- Product managers analyzing app performance and user engagement
- DevOps engineers automating app store workflows
- Anyone looking to streamline their Apple developer experience

This server transforms complex App Store Connect operations into simple conversational commands, whether you're checking app analytics, managing beta testers, or exploring your development pipeline.

<a href="https://glama.ai/mcp/servers/z4j2smln34"><img width="380" height="200" src="https://glama.ai/mcp/servers/z4j2smln34/badge" alt="app-store-connect-mcp-server MCP server" /></a>
<a href="https://smithery.ai/server/appstore-connect-mcp-server" style="text-decoration: none;">
  <img alt="Smithery Installations" src="https://smithery.ai/badge/appstore-connect-mcp-server" />
</a>
[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/joshuarileydev-app-store-connect-mcp-server-badge.png)](https://mseep.ai/app/joshuarileydev-app-store-connect-mcp-server)

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
  - View beta feedback with screenshots and device information

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

- **Analytics & Reports** ✨ **NEW**
  - Create analytics report requests for apps
  - Download App Store engagement, commerce, and usage analytics
  - Access performance and frameworks usage reports
  - Download sales and trends reports (daily, weekly, monthly, yearly)
  - Download finance reports by region

- **Xcode Development Tools** 🔧 **NEW**
  - List available schemes in Xcode projects and workspaces
  - Integrate with development workflows and CI/CD pipelines

## Installation

### Using Smithery

To install App Store Connect Server for Claude Desktop automatically:

```bash
npx @smithery/cli install appstore-connect-mcp-server --client claude
```

### Manual Installation

```bash
npm install @joshuarileydev/app-store-connect-mcp-server
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
        "@joshuarileydev/app-store-connect-mcp-server"
      ],
      "env": {
        "APP_STORE_CONNECT_KEY_ID": "YOUR_KEY_ID",
        "APP_STORE_CONNECT_ISSUER_ID": "YOUR_ISSUER_ID",
        "APP_STORE_CONNECT_P8_PATH": "/path/to/your/auth-key.p8",
        "APP_STORE_CONNECT_VENDOR_NUMBER": "YOUR_VENDOR_NUMBER_OPTIONAL"
      }
    }
  }
}
```

## Authentication

### Required Configuration
1. Generate an App Store Connect API Key from [App Store Connect](https://appstoreconnect.apple.com/access/integrations/api)
2. Download the .p8 private key file
3. Note your Key ID and Issuer ID
4. Set the required environment variables in your configuration:
   - `APP_STORE_CONNECT_KEY_ID`: Your API Key ID
   - `APP_STORE_CONNECT_ISSUER_ID`: Your Issuer ID  
   - `APP_STORE_CONNECT_P8_PATH`: Path to your .p8 private key file

### Optional Configuration for Sales & Finance Reports
To enable sales and finance reporting tools, you'll also need:
- `APP_STORE_CONNECT_VENDOR_NUMBER`: Your vendor number from App Store Connect

**Note**: Sales and finance report tools (`download_sales_report`, `download_finance_report`) will only be available if the vendor number is configured. You can find your vendor number in App Store Connect under "Sales and Trends" or "Payments and Financial Reports".

**Example behavior:**
- ✅ **With vendor number**: All analytics + sales/finance tools available
- ⚠️ **Without vendor number**: Only analytics tools available (sales/finance tools hidden)

## Available Tools

### App Management
- `list_apps`: Get a list of all apps in App Store Connect
- `get_app_info`: Get detailed information about a specific app

### Beta Testing
- `list_beta_groups`: List all beta testing groups
- `list_group_testers`: List testers in a specific beta group
- `add_tester_to_group`: Add a new tester to a beta group
- `remove_tester_from_group`: Remove a tester from a beta group
- `list_beta_feedback_screenshots`: List beta feedback with screenshots (supports both app ID and bundle ID)

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

### Analytics & Reports ✨ **NEW**
- `create_analytics_report_request`: Create a new analytics report request for an app
- `list_analytics_reports`: Get available analytics reports for a request
- `list_analytics_report_segments`: Get segments for a specific analytics report
- `download_analytics_report_segment`: Download data from an analytics report segment

### Sales & Finance Reports 💰 **CONDITIONAL**
*These tools are only available if `APP_STORE_CONNECT_VENDOR_NUMBER` is configured*
- `download_sales_report`: Download sales and trends reports with various frequencies
- `download_finance_report`: Download finance reports for specific regions

### Xcode Development Tools 🔧 **NEW**
- `list_schemes`: List all available schemes in an Xcode project or workspace

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
