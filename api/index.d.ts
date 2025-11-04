import serverless from "serverless-http";
type Cached = {
    conn: any | null;
    promise: Promise<any> | null;
};
declare global {
    var __mongoose__: Cached | undefined;
}
declare const _default: serverless.Handler;
export default _default;
//# sourceMappingURL=index.d.ts.map