import styles from "./App.module.scss";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePacketFactory } from "./hooks/usePacketFactory";
import { usePacketHandlers } from "./hooks/usePacketHandlers";
import { RoomForm } from "./components/RoomForm/RoomForm";
import { RoomView, RoomInfo } from "./components/RoomView/RoomView";
import React from "react";
import { useErrorVisibility } from "./hooks/useErrorVisibility";
import { ErrorPopup } from "./components/ErrorPopup/ErrorPopup";
import { UsernameForm } from "./components/UsernameForm/UsernameForm";

function App() {
  const ws = useWebSocket();
  const {
    setUserName: sendSetUserName,
    createRoom,
    joinRoom,
    setVote,
    resetVoting,
    uncoverCards,
  } = usePacketFactory(ws);

  const [roomInfo, setRoomInfo] = React.useState<RoomInfo>();
  const [username, setUsername] = React.useState<string>();
  const [hasSetUsername, setHasSetUsername] = React.useState(false);
  const [roomName, setRoomName] = React.useState<string>("room");
  const [roomPassword, setRoomPassword] = React.useState<string>();
  const { showError, errorMessage } = useErrorVisibility();

  usePacketHandlers(ws, {
    MESSAGE: (data: any) => console.log("CLIENT MESSAGE", data),
    ROOM_INFO: setRoomInfo,
    ERROR_MESSAGE: (data) => {
      console.log(data);
      showError(data);
    },
    SET_USERNAME: () => setHasSetUsername(true),
  });

  const handleSetUsernameClick = React.useCallback(() => {
    sendSetUserName(username);
    // setRoomName(`${username}'s room`);
  }, [username]);

  const handleCreateRoom = React.useCallback(() => {
    if (roomName && roomPassword) {
      createRoom(roomName, roomPassword);
    }
  }, [roomName, roomPassword]);

  const handleJoinRoom = React.useCallback(() => {
    if (roomName && roomPassword) {
      joinRoom(roomName, roomPassword);
    }
  }, [roomName, roomPassword]);

  return (
    <div className={styles.app}>
      {errorMessage && <ErrorPopup message={errorMessage} />}
      <p className={styles.title}>Planning Poker</p>
      {roomInfo ? (
        <RoomView
          roomInfo={roomInfo}
          handleVote={setVote}
          handleUncoverCards={uncoverCards}
          handleResetVoting={resetVoting}
        />
      ) : !hasSetUsername ? (
        <UsernameForm
          handleSetUsernameClick={handleSetUsernameClick}
          setUsername={setUsername}
        />
      ) : (
        <RoomForm
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
          roomName={roomName}
          setRoomName={setRoomName}
          setRoomPassword={setRoomPassword}
        />
      )}
    </div>
  );
}

export default App;
