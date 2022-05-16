const WebSocket = require("ws");

const wss = new WebSocket.Server({
  port: 8080,
});

const rooms = {};

const prepareRoomToSend = (room) => {
  return {
    roomName: room.roomName,
    users: room.users.map((user) => user.username),
  };
};

const sendRoomDataToAll = (room) => {
  const roomToSend = prepareRoomToSend(room);

  console.log(room);

  room.users.forEach((user) => {
    user.send(
      JSON.stringify({
        type: "ROOM_INFO",
        payload: roomToSend,
      })
    );
  });
};

wss.on("connection", (ws) => {
  console.log("Connected");

  ws.on("close", () => {
    const joinedRoom = rooms[ws.roomName];
    if (joinedRoom) {
      const index = joinedRoom.users.findIndex((user) => user === ws);
      joinedRoom.users.splice(index, 1);

      if(joinedRoom.users.length === 0) {
        delete rooms[ws.roomName];
        return;
      }
      sendRoomDataToAll(joinedRoom);
    }
  });

  ws.on("message", (data) => {
    const packet = JSON.parse(data);

    if (packet.type === "SET_USERNAME") {
      const username = packet.payload;

      ws.username = username;

      const joinedRoom = rooms[ws.roomName];
      if(joinedRoom) {
        sendRoomDataToAll(joinedRoom);
      }
    }

    if (ws.username && packet.type === "CREATE_ROOM") {
      const { roomName, password } = packet.payload;

      if (rooms[roomName] || rooms[ws.roomName]) {
        return;
      }

      ws.roomName = roomName;

      const newRoom = {
        roomName,
        password,
        users: [ws],
      };

      rooms[roomName] = newRoom;

      sendRoomDataToAll(newRoom);
    }

    if (ws.username && packet.type === "JOIN_ROOM") {
      const { roomName, password } = packet.payload;
      if (rooms[roomName] && rooms[roomName].password === password && ws.roomName !== roomName) {
        ws.roomName = roomName;

        rooms[roomName].users.push(ws);

        sendRoomDataToAll(rooms[roomName]);
      }
    }

    if (packet.type === "MESSAGE") {
      wss.clients.forEach((client) => {
        client.send(
          JSON.stringify({
            type: "MESSAGE",
            payload: packet.payload,
          })
        );
      });
    }
  });
});
