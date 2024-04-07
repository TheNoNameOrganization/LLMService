import { FunctionTool } from "openai/resources/beta/index.mjs";
interface FunctionDefinition {
  name: string,
  tags?: string[],
  schema: FunctionTool,
  // If you have a Phd in typing, have a blast, I give up
  handler: (params: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
export class FunctionRegistry {
  private static instance: FunctionRegistry;
  private functionMap: Map<string, FunctionDefinition>;

  private constructor() {
    this.functionMap = new Map<string, FunctionDefinition>();
  }

  public static getInstance(): FunctionRegistry {
    if (!FunctionRegistry.instance) {
      FunctionRegistry.instance = new FunctionRegistry();
    }
    return FunctionRegistry.instance;
  }

  public registerFunction(functionDefinition: FunctionDefinition): void {
    this.functionMap.set(functionDefinition.name, functionDefinition);
  }

  public getFunction(name: string): FunctionDefinition | undefined {
    return this.functionMap.get(name);
  }

  public getSchemasByTag(tag: string) : FunctionTool[] {
    const schemas: FunctionTool[] = [];
    this.functionMap.forEach((value) => {
      if (value.tags && value.tags.includes(tag)) {
        schemas.push(value.schema);
      }
    });
    return schemas;
  }

  public async runFunction(name: string, params: any): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const fx: FunctionDefinition = this.getFunction(name);
    const res = await fx.handler(params);
    return res;
  }
}
