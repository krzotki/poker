export type RoomInfo = {
  roomName: string;
  users: string[];
};

type PropsType = {
  roomInfo: RoomInfo;
};

export const RoomView = ({ roomInfo }: PropsType) => {
  return (
    <div>
      <h1>Room name: {roomInfo.roomName}</h1>
      <p>Connected users:</p>
      {roomInfo.users.map((user, index) => (
        <p key={`${user}_${index}`}>{user}</p>
      ))}
    </div>
  );
};
