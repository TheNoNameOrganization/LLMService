import { FunctionTool } from "openai/resources/beta/index.mjs";
import { FunctionRegistry } from "./FunctionRegistry.js";

type HttpMethod = 'get' | 'post';

type Schema = {
    type: string;
    properties?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

type ParameterArray = Array<{
    name: string,
    in: string,
    description: string,
    required: boolean,
    properties? : Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    schema?: Schema // eslint-disable-line @typescript-eslint/no-explicit-any
}>

type Operation = {
    description: string;
    operationId: string;
    parameters?: ParameterArray

    responses?: {
        // Define response schema
    };
    deprecated?: boolean;
};

type PathItem = {
    [method in HttpMethod]?: Operation;
};

type Paths = {
    [key: string]: PathItem;
};

type GPTSchema = {
    openapi: '3.1.0';
    info: {
        title: string;
        description: string;
        version: 'v1.0.0';
    };
    servers: [
        {
            url: string;
        }
    ];
    paths: Paths;
};

export function createGPTSchema(serverURL: string, tools: FunctionTool[]): GPTSchema {
    const paths: Paths = {};

    tools.forEach(tool => {

        const parameterArray: ParameterArray = [];

        for (const paramName in tool.function.parameters?.properties as Record<string, string>) {
            const param = tool.function.parameters?.properties[paramName];
            const paramSchema = {
                name: paramName,
                in: "body",
                description: param.description,
                required: param.required || false,
                "schema": {
                    "type": param.type,
                    "properties": param.properties || undefined
                }
            }
            if(param["default"]){
                paramSchema["default"] = param.default
            }
            if(paramSchema.schema.properties === undefined) {
                delete paramSchema.schema.properties
            }
            parameterArray.push(paramSchema);
        }
        paths[`/${tool.function.name}`] = {
            "post": {
                description: tool.function.description,
                operationId: tool.function.name,
                parameters: parameterArray
            }
        }
    });

    const schema: GPTSchema = {
        openapi: '3.1.0',
        info: {
            title: 'GPT API',
            description: 'API for GPT-4 Turbo',
            version: 'v1.0.0',
        },
        servers: [
            {
                url: serverURL,
            },
        ],
        paths
    };
    return schema;
}

export function getGPTSchema(fxRegistry: FunctionRegistry, url: string): GPTSchema {
    const schema = createGPTSchema(url, fxRegistry.getSchemasByTag("default"))
    return schema
}