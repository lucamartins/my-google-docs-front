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
  ack?: boolean;
}

export interface OperationTransformer {
  (operation: Operation): Operation;
}
