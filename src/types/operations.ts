export enum OperationTypeEnum {
  Insert = "insert",
  Delete = "delete",
}

export interface Operation {
  type: OperationTypeEnum;
  value: string;
  position: number;
  version: number;
  userId: string;
}

export interface OperationTransformer {
  (operation: Operation, appliedOperations: Operation[]): Operation;
}
