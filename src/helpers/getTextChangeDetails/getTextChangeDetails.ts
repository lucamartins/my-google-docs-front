// @ts-nocheck

import { patienceDiff } from "./utils";

export default function getTextChangeDetails(
  oldTextContent: string,
  newTextContent: string
) {
  const diff = patienceDiff(oldTextContent, newTextContent);
  const operation = { type: "", value: [], position: "" };

  if (diff.lineCountDeleted !== 0) {
    operation.type = "delete";

    const letterData = diff.lines.filter((line) => line.bIndex === -1)[0];

    operation.value = letterData.line;
    operation.position = letterData.aIndex;
  } else if (diff.lineCountInserted !== 0) {
    operation.type = "insert";

    const letterData = diff.lines.filter((line) => line.aIndex === -1)[0];
    operation.value = letterData.line;
    operation.position = letterData.bIndex;
  }

  return operation;
}
