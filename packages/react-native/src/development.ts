export function isAgentLensDevelopment(): boolean {
  const devValue = (globalThis as { __DEV__?: boolean }).__DEV__;
  return typeof devValue === "undefined" ? true : Boolean(devValue);
}
