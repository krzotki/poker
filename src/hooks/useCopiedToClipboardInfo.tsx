import React from "react";

export const useCopiedToClipBoardInfo = () => {
  const [visible, setVisible] = React.useState(false);

  const showCopyInfo = React.useCallback(() => {
    setVisible(true);
  }, []);

  React.useEffect(() => {
    if (visible) {
      const timeout = setTimeout(() => setVisible(false), 3000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [visible]);

  return {
    showCopyInfo,
    visibleCopyInfo: visible,
  };
};
