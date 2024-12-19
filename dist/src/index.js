import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import axios from 'axios';
// Load environment variables
const config = {
    keyId: process.env.APP_STORE_CONNECT_KEY_ID,
    issuerId: process.env.APP_STORE_CONNECT_ISSUER_ID,
    privateKeyPath: process.env.APP_STORE_CONNECT_P8_PATH,
};
// Validate required environment variables
if (!config.keyId || !config.issuerId || !config.privateKeyPath) {
    throw new Error("Missing required environment variables. Please set: " +
        "APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_P8_PATH");
}
class AppStoreConnectServer {
    server;
    axiosInstance;
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
    async generateToken() {
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
    setupHandlers() {
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
                },
                // {
                // name: "upload_screenshots",
                // description: "Upload screenshots to App Store Connect",
                // inputSchema: {
                //   type: "object",
                //   properties: {
                //     appId: {
                //       type: "string",
                //       description: "The ID of the app"
                //     },
                //     screenshotPaths: {
                //       type: "array",
                //       items: {
                //         type: "string"
                //       },
                //       description: "Array of file paths to screenshots"
                //     },
                //     locale: {
                //       type: "string",
                //       description: "Locale for the screenshots (e.g., 'en-US')",
                //       default: "en-US"
                //     }
                //   },
                //   required: ["appId", "screenshotPaths"]
                // }
                // }
            ]
        }));
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const token = await this.generateToken();
                switch (request.params.name) {
                    case "list_apps":
                        const response = await this.axiosInstance.get('/apps', {
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
                        const response = await this.axiosInstance.get('/betaGroups', {
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
                            throw new McpError(ErrorCode.InvalidParams, "groupId is required");
                        }
                        const response = await this.axiosInstance.get(`/betaGroups/${groupId}/betaTesters`, {
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
                        const { groupId, email, firstName, lastName } = request.params.arguments;
                        if (!groupId || !email || !firstName || !lastName) {
                            throw new McpError(ErrorCode.InvalidParams, "groupId, email, firstName, and lastName are required");
                        }
                        const requestBody = {
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
                        const response = await this.axiosInstance.post('/betaTesters', requestBody, {
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
                        const { groupId, testerId } = request.params.arguments;
                        if (!groupId || !testerId) {
                            throw new McpError(ErrorCode.InvalidParams, "groupId and testerId are required");
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
                    // case "upload_screenshots": {
                    //   const { appId, screenshotPaths, locale = "en-US" } = request.params.arguments as {
                    //     appId: string;
                    //     screenshotPaths: string[];
                    //     locale?: string;
                    //   };
                    //   if (!appId || !screenshotPaths?.length) {
                    //     throw new McpError(
                    //       ErrorCode.InvalidParams,
                    //       "appId and screenshotPaths are required"
                    //     );
                    //   }
                    //   // Get available screenshot sets
                    //   const setsResponse = await this.axiosInstance.get<ListScreenshotSetsResponse>(
                    //     `/apps/${appId}/appStoreVersionLocalizations/${locale}/appScreenshotSets`,
                    //     {
                    //       headers: { 'Authorization': `Bearer ${token}` }
                    //     }
                    //   );
                    //   const results = [];
                    //   for (const screenshotPath of screenshotPaths) {
                    //     try {
                    //       // Get image dimensions
                    //       const metadata = await sharp(screenshotPath).metadata();
                    //       if (!metadata.width || !metadata.height) {
                    //         throw new Error(`Could not get dimensions for ${screenshotPath}`);
                    //       }
                    //       // Find matching screenshot set
                    //       const matchingSet = setsResponse.data.data.find((set: ScreenshotSet) => {
                    //         const dimensions = SCREENSHOT_DIMENSIONS[set.attributes.screenshotDisplayType as ScreenshotDisplayType];
                    //         return dimensions && 
                    //           (dimensions.width === metadata.width && dimensions.height === metadata.height ||
                    //            dimensions.width === metadata.height && dimensions.height === metadata.width);
                    //       });
                    //       if (!matchingSet) {
                    //         results.push({
                    //           path: screenshotPath,
                    //           status: 'error',
                    //           message: `No matching screenshot set found for dimensions ${metadata.width}x${metadata.height}`
                    //         });
                    //         continue;
                    //       }
                    //       // Upload screenshot
                    //       const fileName = path.basename(screenshotPath);
                    //       const fileBuffer = await fs.readFile(screenshotPath);
                    //       const uploadResponse = await this.axiosInstance.post(
                    //         `/apps/${appId}/appScreenshots`,
                    //         {
                    //           data: {
                    //             type: "appScreenshots",
                    //             attributes: {
                    //               fileName,
                    //               fileSize: fileBuffer.length
                    //             },
                    //             relationships: {
                    //               appScreenshotSet: {
                    //                 data: {
                    //                   id: matchingSet.id,
                    //                   type: "appScreenshotSets"
                    //                 }
                    //               }
                    //             }
                    //           }
                    //         },
                    //         {
                    //           headers: {
                    //             'Authorization': `Bearer ${token}`,
                    //             'Content-Type': 'application/json'
                    //           }
                    //         }
                    //       );
                    //       // Upload the actual file
                    //       const { uploadOperations } = uploadResponse.data.data.attributes;
                    //       await this.axiosInstance.put(
                    //         uploadOperations[0].url,
                    //         fileBuffer,
                    //         {
                    //           headers: {
                    //             ...uploadOperations[0].requestHeaders,
                    //             'Content-Length': fileBuffer.length
                    //           }
                    //         }
                    //       );
                    //       results.push({
                    //         path: screenshotPath,
                    //         status: 'success',
                    //         setType: matchingSet.attributes.screenshotDisplayType
                    //       });
                    //     } catch (error: any) {
                    //       results.push({
                    //         path: screenshotPath,
                    //         status: 'error',
                    //         message: error.message || 'Unknown error'
                    //       });
                    //     }
                    //   }
                    //   return {
                    //     toolResult: {
                    //       uploads: results
                    //     }
                    //   };
                    // }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
            }
            catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new McpError(ErrorCode.InternalError, `App Store Connect API error: ${error.response?.data?.errors?.[0]?.detail ?? error.message}`);
                }
                throw error;
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("App Store Connect MCP server running on stdio");
    }
}
// Start the server
const server = new AppStoreConnectServer();
server.run().catch(console.error);
