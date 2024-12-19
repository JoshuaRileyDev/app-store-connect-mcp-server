import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import axios from 'axios';
import { AppStoreConnectConfig, ListAppsResponse, ListBetaGroupsResponse, ListBetaTestersResponse, AddTesterRequest, ListScreenshotSetsResponse, ScreenshotSet, SCREENSHOT_DIMENSIONS, ScreenshotDisplayType } from './types.js';
import sharp from 'sharp';
import path from 'path';

// Load environment variables
const config: AppStoreConnectConfig = {
  keyId: process.env.APP_STORE_CONNECT_KEY_ID!,
  issuerId: process.env.APP_STORE_CONNECT_ISSUER_ID!,
  privateKeyPath: process.env.APP_STORE_CONNECT_P8_PATH!,
};

// Validate required environment variables
if (!config.keyId || !config.issuerId || !config.privateKeyPath) {
  throw new Error(
    "Missing required environment variables. Please set: " +
    "APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_P8_PATH"
  );
}

class AppStoreConnectServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server({
      name: "appstore-connect-server",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.axiosInstance = axios.create({
      baseURL: 'https://api.appstoreconnect.apple.com/v1',
    });

    this.setupHandlers();
  }

  private async generateToken(): Promise<string> {
    const privateKey = await fs.readFile(config.privateKeyPath, 'utf-8');
    
    const token = jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      expiresIn: '20m', // App Store Connect tokens can be valid for up to 20 minutes
      audience: 'appstoreconnect-v1',
      keyid: config.keyId,
      issuer: config.issuerId,
    });

    return token;
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [{
        name: "list_apps",
        description: "Get a list of all apps in App Store Connect",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of apps to return (default: 100)",
              minimum: 1,
              maximum: 200
            }
          }
        }
      }, {
        name: "list_beta_groups",
        description: "Get a list of all beta groups (internal and external)",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of groups to return (default: 100)",
              minimum: 1,
              maximum: 200
            }
          }
        }
      }, {
        name: "list_group_testers",
        description: "Get a list of all testers in a specific beta group",
        inputSchema: {
          type: "object",
          properties: {
            groupId: {
              type: "string",
              description: "The ID of the beta group"
            },
            limit: {
              type: "number",
              description: "Maximum number of testers to return (default: 100)",
              minimum: 1,
              maximum: 200
            }
          },
          required: ["groupId"]
        }
      }, {
        name: "add_tester_to_group",
        description: "Add a new tester to a beta group",
        inputSchema: {
          type: "object",
          properties: {
            groupId: {
              type: "string",
              description: "The ID of the beta group"
            },
            email: {
              type: "string",
              description: "Email address of the tester"
            },
            firstName: {
              type: "string",
              description: "First name of the tester"
            },
            lastName: {
              type: "string",
              description: "Last name of the tester"
            }
          },
          required: ["groupId", "email", "firstName", "lastName"]
        }
      }, {
        name: "remove_tester_from_group",
        description: "Remove a tester from a beta group",
        inputSchema: {
          type: "object",
          properties: {
            groupId: {
              type: "string",
              description: "The ID of the beta group"
            },
            testerId: {
              type: "string",
              description: "The ID of the beta tester"
            }
          },
          required: ["groupId", "testerId"]
        }
      }, {
        name: "get_app_info",
        description: "Get detailed information about a specific app",
        inputSchema: {
          type: "object", 
          properties: {
            appId: {
              type: "string",
              description: "The ID of the app to get information for"
            },
            include: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "appClips",
                  "appInfos",
                  "appStoreVersions",
                  "availableTerritories",
                  "betaAppReviewDetail",
                  "betaGroups",
                  "betaLicenseAgreement",
                  "builds",
                  "endUserLicenseAgreement",
                  "gameCenterEnabledVersions",
                  "inAppPurchases",
                  "preOrder",
                  "prices",
                  "reviewSubmissions"
                ]
              },
              description: "Optional relationships to include in the response"
            }
          },
          required: ["appId"]
        }
      }, {
        name: "create_bundle_id",
        description: "Register a new bundle ID for app development",
        inputSchema: {
          type: "object",
          properties: {
            identifier: {
              type: "string",
              description: "The bundle ID string (e.g., 'com.example.app')"
            },
            name: {
              type: "string",
              description: "A name for the bundle ID"
            },
            platform: {
              type: "string",
              enum: ["IOS", "MAC_OS", "UNIVERSAL"],
              description: "The platform for this bundle ID"
            },
            seedId: {
              type: "string",
              description: "Your team's seed ID (optional)",
              required: false
            }
          },
          required: ["identifier", "name", "platform"]
        }
      }, {
        name: "list_bundle_ids",
        description: "Find and list bundle IDs that are registered to your team",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of bundle IDs to return (default: 100, max: 200)",
              minimum: 1,
              maximum: 200
            },
            sort: {
              type: "string",
              description: "Sort order for the results",
              enum: [
                "name", "-name",
                "platform", "-platform", 
                "identifier", "-identifier",
                "seedId", "-seedId",
                "id", "-id"
              ]
            },
            filter: {
              type: "object",
              properties: {
                identifier: {
                  type: "string",
                  description: "Filter by bundle identifier"
                },
                name: {
                  type: "string",
                  description: "Filter by name"
                },
                platform: {
                  type: "string",
                  description: "Filter by platform",
                  enum: ["IOS", "MAC_OS", "UNIVERSAL"]
                },
                seedId: {
                  type: "string",
                  description: "Filter by seed ID"
                }
              }
            },
            include: {
              type: "array",
              items: {
                type: "string",
                enum: ["profiles", "bundleIdCapabilities", "app"]
              },
              description: "Related resources to include in the response"
            }
          }
        }
      }, {
        name: "get_bundle_id_info",
        description: "Get detailed information about a specific bundle ID",
        inputSchema: {
          type: "object",
          properties: {
            bundleIdId: {
              type: "string",
              description: "The ID of the bundle ID to get information for"
            },
            include: {
              type: "array",
              items: {
                type: "string",
                enum: ["profiles", "bundleIdCapabilities", "app"],
                description: "Related resources to include in the response"
              },
              description: "Optional relationships to include in the response"
            },
            fields: {
              type: "object",
              properties: {
                bundleIds: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["name", "platform", "identifier", "seedId"]
                  },
                  description: "Fields to include for the bundle ID"
                }
              },
              description: "Specific fields to include in the response"
            }
          },
          required: ["bundleIdId"]
        }
      }, {
        name: "list_devices",
        description: "Get a list of all devices registered to your team",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of devices to return (default: 100, max: 200)",
              minimum: 1,
              maximum: 200
            },
            sort: {
              type: "string",
              description: "Sort order for the results",
              enum: [
                "name", "-name",
                "platform", "-platform",
                "status", "-status",
                "udid", "-udid",
                "deviceClass", "-deviceClass",
                "model", "-model",
                "addedDate", "-addedDate"
              ]
            },
            filter: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Filter by device name"
                },
                platform: {
                  type: "string",
                  description: "Filter by platform",
                  enum: ["IOS", "MAC_OS"]
                },
                status: {
                  type: "string",
                  description: "Filter by status",
                  enum: ["ENABLED", "DISABLED"]
                },
                udid: {
                  type: "string",
                  description: "Filter by device UDID"
                },
                deviceClass: {
                  type: "string",
                  description: "Filter by device class",
                  enum: ["APPLE_WATCH", "IPAD", "IPHONE", "IPOD", "APPLE_TV", "MAC"]
                }
              }
            },
            fields: {
              type: "object",
              properties: {
                devices: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["name", "platform", "udid", "deviceClass", "status", "model", "addedDate"]
                  },
                  description: "Fields to include for each device"
                }
              }
            }
          }
        }
      }]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const token = await this.generateToken();
        
        switch (request.params.name) {
          case "list_apps":
            const response = await this.axiosInstance.get<ListAppsResponse>('/apps', {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              params: {
                limit: request.params.arguments?.limit || 100
              }
            });

            return {
              toolResult: response.data
            };

          case "list_beta_groups": {
            const response = await this.axiosInstance.get<ListBetaGroupsResponse>('/betaGroups', {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              params: {
                limit: request.params.arguments?.limit || 100,
                // Include relationships to get more details
                include: 'app,betaTesters'
              }
            });

            return {
              toolResult: response.data
            };
          }

          case "list_group_testers": {
            const { groupId, limit = 100 } = request.params.arguments || {};
            
            if (!groupId) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "groupId is required"
              );
            }

            const response = await this.axiosInstance.get<ListBetaTestersResponse>(`/betaGroups/${groupId}/betaTesters`, {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              params: {
                limit
              }
            });

            return {
              toolResult: response.data
            };
          }

          case "add_tester_to_group": {
            const { groupId, email, firstName, lastName } = request.params.arguments as {
              groupId: string;
              email: string;
              firstName: string;
              lastName: string;
            };
            
            if (!groupId || !email || !firstName || !lastName) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "groupId, email, firstName, and lastName are required"
              );
            }

            const requestBody: AddTesterRequest = {
              data: {
                type: "betaTesters",
                attributes: {
                  email,
                  firstName,
                  lastName
                },
                relationships: {
                  betaGroups: {
                    data: [{
                      id: groupId,
                      type: "betaGroups"
                    }]
                  }
                }
              }
            };

            const response = await this.axiosInstance.post<ListBetaTestersResponse>('/betaTesters', requestBody, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            return {
              toolResult: response.data
            };
          }

          case "remove_tester_from_group": {
            const { groupId, testerId } = request.params.arguments as {
              groupId: string;
              testerId: string;
            };
            
            if (!groupId || !testerId) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "groupId and testerId are required"
              );
            }

            await this.axiosInstance.delete(`/betaGroups/${groupId}/relationships/betaTesters`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              data: {
                data: [{
                  id: testerId,
                  type: "betaTesters"
                }]
              }
            });

            return {
              toolResult: { success: true, message: "Tester removed from group successfully" }
            };
          }

          case "get_app_info": {
            const { appId, include } = request.params.arguments as {
              appId: string;
              include?: string[];
            };
            
            if (!appId) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "appId is required"
              );
            }

            const response = await this.axiosInstance.get(`/apps/${appId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              params: {
                include: include?.join(',')
              }
            });

            return {
              toolResult: response.data
            };
          }

          case "create_bundle_id": {
            const { identifier, name, platform, seedId } = request.params.arguments as {
              identifier: string;
              name: string;
              platform: string;
              seedId?: string;
            };
            
            if (!identifier || !name || !platform) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "identifier, name, and platform are required"
              );
            }

            const requestBody = {
              data: {
                type: "bundleIds",
                attributes: {
                  identifier,
                  name,
                  platform,
                  seedId
                }
              }
            };

            const response = await this.axiosInstance.post('/bundleIds', requestBody, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            return {
              toolResult: response.data
            };
          }

          case "list_bundle_ids": {
            interface ListBundleIdsArgs {
              limit?: number;
              sort?: string;
              filter?: {
                identifier?: string;
                name?: string;
                platform?: string;
                seedId?: string;
              };
              include?: string[];
            }

            const { limit = 100, sort, filter, include } = request.params.arguments as ListBundleIdsArgs || {};
            
            const params: Record<string, any> = {
              limit: Math.min(Number(limit), 200)
            };

            // Add sort parameter if provided
            if (sort) {
              params.sort = sort;
            }

            // Add filters if provided
            if (filter) {
              if (filter.identifier) params['filter[identifier]'] = filter.identifier;
              if (filter.name) params['filter[name]'] = filter.name;
              if (filter.platform) params['filter[platform]'] = filter.platform;
              if (filter.seedId) params['filter[seedId]'] = filter.seedId;
            }

            // Add includes if provided
            if (Array.isArray(include) && include.length > 0) {
              params.include = include.join(',');
            }

            const response = await this.axiosInstance.get('/bundleIds', {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              params
            });

            return {
              toolResult: response.data
            };
          }

          case "get_bundle_id_info": {
            const { bundleIdId, include, fields } = request.params.arguments as {
              bundleIdId: string;
              include?: string[];
              fields?: {
                bundleIds?: string[];
              };
            };
            
            if (!bundleIdId) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "bundleIdId is required"
              );
            }

            const params: Record<string, any> = {};

            // Add fields if provided
            if (fields?.bundleIds?.length) {
              params['fields[bundleIds]'] = fields.bundleIds.join(',');
            }

            // Add includes if provided
            if (include?.length) {
              params.include = include.join(',');
            }

            const response = await this.axiosInstance.get(`/bundleIds/${bundleIdId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              params
            });

            return {
              toolResult: response.data
            };
          }

          case "list_devices": {
            interface ListDevicesArgs {
              limit?: number;
              sort?: string;
              filter?: {
                name?: string;
                platform?: string;
                status?: string;
                udid?: string;
                deviceClass?: string;
              };
              fields?: {
                devices?: string[];
              };
            }

            const { limit = 100, sort, filter, fields } = request.params.arguments as ListDevicesArgs || {};
            
            const params: Record<string, any> = {
              limit: Math.min(Number(limit), 200)
            };

            // Add sort parameter if provided
            if (sort) {
              params.sort = sort;
            }

            // Add filters if provided
            if (filter) {
              if (filter.name) params['filter[name]'] = filter.name;
              if (filter.platform) params['filter[platform]'] = filter.platform;
              if (filter.status) params['filter[status]'] = filter.status;
              if (filter.udid) params['filter[udid]'] = filter.udid;
              if (filter.deviceClass) params['filter[deviceClass]'] = filter.deviceClass;
            }

            // Add fields if provided
            if (fields?.devices?.length) {
              params['fields[devices]'] = fields.devices.join(',');
            }

            const response = await this.axiosInstance.get('/devices', {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              params
            });

            return {
              toolResult: response.data
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new McpError(
            ErrorCode.InternalError,
            `App Store Connect API error: ${error.response?.data?.errors?.[0]?.detail ?? error.message}`
          );
        }
        throw error;
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("App Store Connect MCP server running on stdio");
  }
}

// Start the server
const server = new AppStoreConnectServer();
server.run().catch(console.error); 