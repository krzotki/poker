import styles from "./../../App.module.scss";
import css from "./RoomForm.module.scss";
import cx from "classnames";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faCircleArrowLeft } from "@fortawesome/free-solid-svg-icons";

type PropsType = {
  setRoomName: (roomName: string) => void;
  roomName: string | undefined;
  setRoomPassword: (roomPassword: string) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: () => void;
  handleBackClick: () => void;
};

export const RoomForm = ({
  handleCreateRoom,
  handleJoinRoom,
  roomName,
  setRoomName,
  setRoomPassword,
  handleBackClick,
}: PropsType) => {
  return (
    <div className={cx(styles.usernameForm, css.gameForm)}>
      {/* <FontAwesomeIcon onClick={handleBackClick} className={styles.backButton} icon={faCircleArrowLeft} /> */}
      <input
        onChange={(evt) => setRoomName(evt.target.value)}
        placeholder="Room name"
        value={roomName}
      />
      <input
        type="password"
        onChange={(evt) => setRoomPassword(evt.target.value)}
        placeholder="Room password"
      />

      <div className={css.buttons}>
        <button onClick={handleJoinRoom}>JOIN ROOM</button>
        <button onClick={handleCreateRoom}>CREATE ROOM</button>
      </div>
    </div>
  );
};
