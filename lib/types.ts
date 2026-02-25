import type { AxiosInstance } from 'axios';

// ── Domain models ──

export interface WatchFile {
  type: 'json' | 'js';
  filename: string;
}

export interface ScriptData {
  id: string;
  path: string;
  content: string;
}

export interface AlertData {
  id: string;
  name: string;
  path: string;
  watchFiles: WatchFile[];
  scripts?: ScriptData[];
}

// ── Auth ──

export interface ApiKeyAuth {
  headers: { Authorization: string };
}

export interface BasicAuth {
  auth: {
    username: string;
    password: string;
  };
}

export type AuthOptions = ApiKeyAuth | BasicAuth | Record<string, never>;

// ── Logger ──

export interface Logger {
  debugMode: boolean;
  info: (...args: string[]) => void;
  notice: (...args: string[]) => void;
  debug: (...args: string[]) => void;
  error: (...args: string[]) => void;
  warn: (...args: string[]) => void;
  startGroup: (msg: string) => void;
  endGroup: () => void;
}

// ── HTTP ──

export type HttpClient = AxiosInstance;

// ── Service contracts ──

export interface DeployWatchClientContract {
  deploy(params: { id: string; content: Record<string, unknown> }): Promise<void>;
  delete(params: { id: string }): Promise<boolean>;
}

export interface DeployScriptClientContract {
  deploy(params: { id: string; content: string }): Promise<void>;
}

export interface TranspileService {
  transpile: (scriptContent: string, currentDir: string, env: Record<string, string>) => string;
}

export interface AlertRepository {
  findAlertByPath(alertPath: string): import('./core/alert.ts').Alert | null;
}

// ── DSL types ──

export interface ComparisonOp {
  [key: symbol]: true;
  operator: string;
  value: string | number;
}

export interface IsOneOfMarker {
  [key: symbol]: true;
  values: string[];
}

export interface QuerySpec {
  indexes: string[];
  timeRange?: string;
  query?: string;
  filters?: Record<string, string | IsOneOfMarker>;
}

export interface QueryMarker {
  [key: symbol]: true;
  spec: QuerySpec;
}

export interface RawQueryMarker {
  [key: symbol]: true;
  body: Record<string, unknown>;
}

export interface MarkdownMessage {
  [key: symbol]: true;
  blocks: SlackBlock[];
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<Record<string, unknown>>;
}

export interface MarkdownOptions {
  actions?: Array<{ text: string; url: string; style?: string }>;
  context?: Array<{ text: string; url: string }>;
}

// ── DSL builder types ──

export interface WebhookActionSpec {
  name?: string;
  transform?: Record<string, unknown>;
  throttle_period?: string;
  configs: Record<string, unknown>;
  message?: MarkdownMessage;
}

export interface ScriptReference {
  id: string;
  fullPath: string;
}

// ── CLI options ──

export interface PushOptions {
  diffBranch?: string;
  projectId?: string;
  baseDir: string;
  mainBranch: string;
  dryRun?: boolean;
  endpoint?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  target?: string;
}

export interface SyncOptions extends PushOptions {
  removeOnly?: boolean;
  pushOnly?: boolean;
}

export interface HeartbeatOptions {
  baseDir?: string;
  verbose?: boolean;
  configPath?: string;
  endpoint?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  dryRun?: boolean;
}

export interface HeartbeatConfig {
  alerts: string[];
  interval: string;
  indices: string | string[];
  projectId?: string;
  action: {
    slack: {
      path: string;
    };
  };
}

// ── Error types ──

export const ErrorType = {
  PainlessCompilation: 'PainlessCompilation',
  Request: 'Request',
  WatchDeployment: 'WatchDeployment',
} as const;

export type ErrorTypeName = typeof ErrorType[keyof typeof ErrorType];
