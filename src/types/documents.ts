import { Operation } from ".";

export interface SharedDocument {
  version: number;
  operations: Operation[];
  textContent: string[];
  currentUserId: string;
}
