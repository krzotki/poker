import React from "react";

export const useTableResize = () => {
  const [tableRef, setTableRef] = React.useState<HTMLDivElement | null>();

  const [tableRect, setTableRect] = React.useState(
    tableRef?.getBoundingClientRect()
  );

  React.useEffect(() => {
    if (tableRef) {
      setTableRect(tableRef.getBoundingClientRect());
      window.onresize = () => {
        setTableRect(tableRef.getBoundingClientRect());
      };

      return () => {
          window.onresize = null;
      }
    }
  }, [tableRef]);

  return {
    setTableRef,
    tableRect,
  };
};
