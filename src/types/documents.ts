import { Operation } from ".";

export interface SharedDocument {
  version: number;
  operations: Operation[];
  localOperation: Operation | null;
  textContent: string[];
  currentUserId: string;
}
