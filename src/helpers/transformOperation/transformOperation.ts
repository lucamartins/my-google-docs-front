// when receiving an operation from the server
// if the operation was made LOCALLY, it does nothing (it is an ACK)
// if operation is REMOTE, verify the need of transformation

// when inserting and deleting ONLY one char per time, transformation will be required when
// previous operations have inserted and/or deleted BEFORE the current operation position index

// note. 1: operations saved in SharedDocument (locally) have to be at transformed version (if required)

// note. 2: it has to look back into all operations made between operation versions
// for instance, current version is 3, and the operation is made in version 1, it has to look into
// operations (transformed) made in version 2 and 3
// so, from OPERATION_VERSION to CURRENT_VERSION

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
