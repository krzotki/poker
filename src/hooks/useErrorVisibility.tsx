import React from "react";

export const useErrorVisibility = () => {

  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (!message) return;
    
    const timeout = setTimeout(() => setMessage(''), 3000);

    return () => {
      setMessage('');
      clearTimeout(timeout);
    };
  }, [message]);

  const show = React.useCallback((message: string) => {
    setMessage(message);
  }, []);

  return {
    showError: show,
    errorMessage: message
  };
};
