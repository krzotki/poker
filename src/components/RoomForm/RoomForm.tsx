import styles from "./../../App.module.scss";
import css from "./RoomForm.module.scss";
import cx from "classnames";

type PropsType = {
  setRoomName: (roomName: string) => void;
  roomName: string | undefined;
  setRoomPassword: (roomPassword: string) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: () => void;
};

export const RoomForm = ({
  handleCreateRoom,
  handleJoinRoom,
  roomName,
  setRoomName,
  setRoomPassword,
}: PropsType) => {
  return (
    <div className={cx(styles.usernameForm, css.gameForm)}>
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
