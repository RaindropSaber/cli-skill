import type { APIRequestContext, Browser, BrowserContext, Page } from "playwright";
import type { ZodObject, ZodRawShape, ZodTypeAny, infer as ZodInfer } from "zod";

export interface RuntimePaths {
  storageRoot: string;
  authDir: string;
  screenshotsDir: string;
  tracesDir: string;
}

export interface BrowserSkillConfig {
  skillsRoot?: string;
  agentsSkillsRoot?: string;
  env?: Record<string, string>;
  skillConfig?: Record<string, Record<string, unknown>>;
  skills?: Record<
    string,
    {
      env?: Record<string, string>;
      storageRoot?: string;
    }
  >;
}

export interface SkillConfigAccessor<ConfigValue = unknown> {
  value: ConfigValue;
  get<T = unknown>(keyPath?: string): T;
  set(keyPath: string, value: unknown): void;
}

export interface ToolContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  request: APIRequestContext;
  skill: {
    name: string;
  };
  config: SkillConfigAccessor;
  env: Record<string, string>;
  paths: RuntimePaths;
  storageStatePath: string;
}

export interface ToolExample {
  scenario: string;
  command: string;
}

export interface ToolDefinition<
  InputSchema extends ZodTypeAny = ZodTypeAny,
  OutputSchema extends ZodTypeAny = ZodTypeAny,
> {
  name: string;
  description: string;
  examples?: ToolExample[];
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  run(input: ZodInfer<InputSchema>, ctx: ToolContext): Promise<ZodInfer<OutputSchema>>;
}

export interface SkillDefinition<
  Tools extends readonly ToolDefinition[] = readonly ToolDefinition[],
  ConfigShape extends ZodRawShape = ZodRawShape,
> {
  name: string;
  cliName?: string;
  rootDir?: string;
  tools: Tools;
  config: ConfigShape;
}

export interface RuntimeOptions {
  headed?: boolean;
  storageRoot?: string;
  storageStatePath?: string;
  skill?: SkillDefinition;
}

export type AnyTool = ToolDefinition<ZodTypeAny, ZodTypeAny>;
export type AnySkill = SkillDefinition<readonly ToolDefinition[], ZodRawShape>;
export type SkillConfigObject<ConfigShape extends ZodRawShape> = ZodObject<ConfigShape>;
