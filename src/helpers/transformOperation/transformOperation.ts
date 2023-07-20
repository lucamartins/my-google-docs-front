import { OperationTransformer, OperationTypeEnum } from "../../types";

const transformOperation: OperationTransformer = (
  incomingOperation,
  appliedOperations
) => {
  const transformedOperation = Object.assign({}, incomingOperation);

  // look for operations that were applied after the incoming operation
  const operationsToLookWhenTransforming = appliedOperations.filter(
    (operation) => operation.version >= incomingOperation.version
  );

  // ensure it is sorted by version, minor to major
  operationsToLookWhenTransforming.sort((a, b) => a.version - b.version);

  operationsToLookWhenTransforming.forEach((appliedOperation) => {
    if (transformedOperation.position > appliedOperation.position) {
      if (appliedOperation.type === OperationTypeEnum.Insert) {
        transformedOperation.position++;
      } else {
        transformedOperation.position--;
      }
    }
  });

  return transformedOperation;
};

export default transformOperation;
