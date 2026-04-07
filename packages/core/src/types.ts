import type { ZodObject, ZodRawShape, ZodTypeAny, infer as ZodInfer } from "zod";

export interface RuntimePaths {
  storageRoot: string;
  browserUserDataDir: string;
  authDir: string;
  screenshotsDir: string;
  tracesDir: string;
}

export interface CliSkillConfig {
  skillsRoot?: string;
  installedSkillsRoot?: string;
  agentsSkillsRoot?: string;
  browserExecutablePath?: string;
  browserUserDataDir?: string;
  browserSourceUserDataDir?: string;
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

export interface BaseToolContext {
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

export interface SkillPluginSetupOptions {
  headed?: boolean;
  storageRoot?: string;
  storageStatePath?: string;
  browserUserDataDir?: string;
  browserExecutablePath?: string;
}

export interface SkillPlugin<Ctx extends object = object> {
  name: string;
  setup(
    ctx: BaseToolContext,
    options: SkillPluginSetupOptions & { skill: AnySkill; globalConfig: CliSkillConfig },
  ): Promise<Ctx> | Ctx;
  dispose?(ctx: BaseToolContext & Ctx): Promise<void> | void;
}

type UnionToIntersection<U> =
  (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never;

export type PluginContext<Plugin extends SkillPlugin<any>> = Plugin extends SkillPlugin<infer Ctx>
  ? Ctx
  : never;

export type InferPluginsContext<Plugins extends readonly SkillPlugin<any>[]> =
  [Plugins[number]] extends [never]
    ? {}
    : UnionToIntersection<PluginContext<Plugins[number]>> extends object
      ? UnionToIntersection<PluginContext<Plugins[number]>>
      : {};

export interface ToolDefinition<
  InputSchema extends ZodTypeAny = ZodTypeAny,
  OutputSchema extends ZodTypeAny = ZodTypeAny,
  Plugins extends readonly SkillPlugin<any>[] = readonly SkillPlugin<any>[],
> {
  name: string;
  description: string;
  examples?: ToolExample[];
  plugins: Plugins;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  run(
    input: ZodInfer<InputSchema>,
    ctx: BaseToolContext & InferPluginsContext<Plugins>,
  ): Promise<ZodInfer<OutputSchema>>;
}

export interface SkillDefinition<
  Tools extends readonly ToolDefinition<any, any, any>[] = readonly ToolDefinition<any, any, any>[],
  ConfigShape extends ZodRawShape = ZodRawShape,
> {
  name: string;
  description: string;
  overview?: string;
  rootDir?: string;
  tools: Tools;
  config: ConfigShape;
}

export interface RuntimeOptions<Skill extends AnySkill = AnySkill> extends SkillPluginSetupOptions {
  skill?: Skill;
}

export type AnyTool = ToolDefinition<ZodTypeAny, ZodTypeAny, readonly SkillPlugin<any>[]>;
export type AnySkill = SkillDefinition<
  readonly ToolDefinition<any, any, any>[],
  ZodRawShape
>;
export type SkillConfigObject<ConfigShape extends ZodRawShape> = ZodObject<ConfigShape>;

export type InferToolsContext<Tools extends readonly ToolDefinition<any, any, any>[]> =
  [Tools[number]] extends [never]
    ? {}
    : UnionToIntersection<
        PluginContext<
          NonNullable<
            Tools[number] extends ToolDefinition<any, any, infer Plugins> ? Plugins[number] : never
          >
        >
      > extends object
      ? UnionToIntersection<
          PluginContext<
            NonNullable<
              Tools[number] extends ToolDefinition<any, any, infer Plugins> ? Plugins[number] : never
            >
          >
        >
      : {};
