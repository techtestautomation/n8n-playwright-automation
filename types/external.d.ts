declare module 'fastify' {
  export interface FastifyRequest<T = unknown> { body: T extends { Body: infer B } ? B : unknown }
  export interface FastifyReply { code(statusCode: number): FastifyReply; send(payload: unknown): unknown }
  export interface FastifyInstance {
    get(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => unknown | Promise<unknown>): void;
    post<T = unknown>(path: string, handler: (request: FastifyRequest<T>, reply: FastifyReply) => unknown | Promise<unknown>): void;
    listen(opts: { port: number; host: string }): Promise<string>;
    close(): Promise<void>;
  }
  export default function Fastify(options?: Record<string, unknown>): FastifyInstance;
}
declare module 'playwright' {
  export interface Browser { newContext(options?: Record<string, unknown>): Promise<BrowserContext>; close(): Promise<void> }
  export interface BrowserContext { newPage(): Promise<Page>; tracing: { start(options?: Record<string, unknown>): Promise<void>; stop(options?: Record<string, unknown>): Promise<void> }; close(): Promise<void> }
  export interface Page {
    goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
    setContent(html: string): Promise<void>;
    title(): Promise<string>;
    url(): string;
    screenshot(options: { path: string; fullPage?: boolean }): Promise<unknown>;
  }
  export const chromium: { launch(options?: Record<string, unknown>): Promise<Browser> };
}
