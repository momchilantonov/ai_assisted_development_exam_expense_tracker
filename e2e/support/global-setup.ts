import { startAll, stopAll } from "./servers";

export default async function globalSetup(): Promise<() => Promise<void>> {
  await startAll();
  return stopAll;
}
