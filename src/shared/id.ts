import { v7 } from "uuid";

export function createId(): string {
  return v7();
}
