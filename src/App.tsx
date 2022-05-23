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
import { Router } from "react-router-dom";

function App() {
  const { ws, wsClosed } = useWebSocket();
  const {
    setUserName: sendSetUserName,
    createRoom,
    joinRoom,
    setVote,
    resetVoting,
    uncoverCards,
    quitRoom,
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
  }, [username, sendSetUserName]);

  const handleCreateRoom = React.useCallback(() => {
    createRoom(roomName, roomPassword);
  }, [roomName, roomPassword, createRoom]);

  const handleJoinRoom = React.useCallback(() => {
    joinRoom(roomName, roomPassword);
  }, [roomName, roomPassword, joinRoom]);

  return (
    <div className={styles.app}>
      {errorMessage && <ErrorPopup message={errorMessage} />}
      <p className={styles.title}>Planning Poker</p>
      {wsClosed ? (
        <h1>Disconnected. Please refresh the page</h1>
      ) : roomInfo ? (
        <RoomView
          roomInfo={roomInfo}
          handleVote={setVote}
          handleUncoverCards={uncoverCards}
          handleResetVoting={resetVoting}
          handleBackClick={quitRoom}
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
          handleBackClick={() => {
            setUsername("");
            setHasSetUsername(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
