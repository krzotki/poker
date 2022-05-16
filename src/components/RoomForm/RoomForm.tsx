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
    <div>
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
      <button onClick={handleCreateRoom}>Create room</button>
      <button onClick={handleJoinRoom}>Join room</button>
    </div>
  );
};
