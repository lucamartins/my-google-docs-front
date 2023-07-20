const calculateNewCursorPosition = (
  cursorPosition: number,
  textLength: number,
  newTextLength: number
) => {
  const diff = newTextLength - textLength;
  const newCursorPosition = cursorPosition + diff;
  return newCursorPosition;
};

export default calculateNewCursorPosition;
