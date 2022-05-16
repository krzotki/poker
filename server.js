
const express = require('express');
const http = require('http');
const WebSocket = require('ws');


const app = express();
const server = http.createServer(app);

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/build/index.html");
});

app.use("/", express.static(__dirname + "/build/"));

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});

const wss = new WebSocket.Server({ server });

const rooms = {};

const prepareRoomToSend = (room) => {
  return {
    roomName: room.roomName,
    cardsCovered: room.cardsCovered,
    lockedVoting: room.lockedVoting,
    users: room.users.map((user) => ({
      name: user.username,
      hasVoted: !!user.uservote,
      vote: room.cardsCovered ? null : user.uservote,
    })),
  };
};

const sendRoomDataToAll = (room) => {
  const roomToSend = prepareRoomToSend(room);

  console.log(roomToSend);

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

      if (joinedRoom.users.length === 0) {
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
      if (joinedRoom) {
        sendRoomDataToAll(joinedRoom);
      }
    }

    if (packet.type === "SET_VOTE") {
      const vote = packet.payload;

      ws.uservote = vote;

      const joinedRoom = rooms[ws.roomName];
      if (joinedRoom) {
        sendRoomDataToAll(joinedRoom);
      }
    }

    if (packet.type === "UNCOVER_CARDS") {
      const joinedRoom = rooms[ws.roomName];
      if (!joinedRoom || joinedRoom.lockedVoting) return;

      const allVoted = !joinedRoom.users.find((user) => !user.uservote);

      console.log("UNCOVER", { allVoted });

      if (allVoted) {
        joinedRoom.lockedVoting = true;
        sendRoomDataToAll(joinedRoom);

        setTimeout(() => {
          joinedRoom.cardsCovered = false;
          sendRoomDataToAll(joinedRoom);
        }, 3000);
      }
    }

    if (packet.type === "RESET_VOTING") {
      const joinedRoom = rooms[ws.roomName];
      if (!joinedRoom || joinedRoom.cardsCovered) return;

      joinedRoom.lockedVoting = false;
      joinedRoom.cardsCovered = true;
      joinedRoom.users.forEach((user) => (user.uservote = null));

      sendRoomDataToAll(joinedRoom);
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
        cardsCovered: true,
        lockedVoting: false,
        users: [ws],
      };

      rooms[roomName] = newRoom;

      sendRoomDataToAll(newRoom);
    }

    if (ws.username && packet.type === "JOIN_ROOM") {
      const { roomName, password } = packet.payload;
      if (
        rooms[roomName] &&
        rooms[roomName].password === password &&
        ws.roomName !== roomName
      ) {
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
