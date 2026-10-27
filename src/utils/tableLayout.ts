type TableColumnWidth = {
  width?: number | string;
  hideInTable?: boolean;
  children?: readonly TableColumnWidth[];
};

/** A numeric scroll width lets Ant Design honor column widths and sticky columns. */
export function getTableScrollX(
  columns: readonly TableColumnWidth[],
  selectionWidth = 0,
): number {
  return columns.reduce((total, column) => {
    if (column.hideInTable) return total;
    if (column.children) return total + getTableScrollX(column.children);
    return total + (typeof column.width === 'number' ? column.width : 160);
  }, selectionWidth);
}
