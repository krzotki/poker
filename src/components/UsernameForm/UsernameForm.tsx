import React from "react";
import styles from "../../App.module.scss";

type PropsType = {
  setUsername: (name: string) => void;
  handleSetUsernameClick: () => void;
};

export const UsernameForm = ({
  handleSetUsernameClick,
  setUsername,
}: PropsType) => {
  const handleKeyPress = React.useCallback((key: string) => {
    if(key === 'Enter') {
        handleSetUsernameClick();
    }
  }, [handleSetUsernameClick]);

  return (
    <div className={styles.usernameForm}>
      <input
        placeholder="Name..."
        onChange={(evt) => setUsername(evt.target.value)}
        onKeyDown={(evt) => handleKeyPress(evt.key)}
      />
      <button onClick={handleSetUsernameClick}>SET USERNAME</button>
    </div>
  );
};
