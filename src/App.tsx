import styles from "./App.module.scss";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePacketFactory } from "./hooks/usePacketFactory";
import { usePacketHandlers } from "./hooks/usePacketHandlers";
import { RoomForm } from "./components/RoomForm/RoomForm";
import { RoomView, RoomInfo } from "./components/RoomView/RoomView";
import React from "react";

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
  const [roomName, setRoomName] = React.useState<string>('room');
  const [roomPassword, setRoomPassword] = React.useState<string>();

  usePacketHandlers(ws, {
    MESSAGE: (data: any) => console.log("CLIENT MESSAGE", data),
    ROOM_INFO: setRoomInfo,
  });

  const handleSetUsernameClick = React.useCallback(() => {
    if (username) {
      sendSetUserName(username);
      setHasSetUsername(true);
      // setRoomName(`${username}'s room`);
    }
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
      Poker
      {roomInfo ? (
        <RoomView
          roomInfo={roomInfo}
          handleVote={setVote}
          handleUncoverCards={uncoverCards}
          handleResetVoting={resetVoting}
        />
      ) : !hasSetUsername ? (
        <div>
          <input onChange={(evt) => setUsername(evt.target.value)} />
          <button onClick={handleSetUsernameClick}>Set username</button>
        </div>
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
