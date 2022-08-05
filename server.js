const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { v4 } = require("uuid");

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
      hasVoted: user.uservote !== undefined,
      vote: room.cardsCovered ? null : user.uservote,
    })),
    key: room.roomKey,
  };
};

const sendRoomDataToAll = (room) => {
  const roomToSend = prepareRoomToSend(room);

  room.users.forEach((user) => {
    user.send(
      JSON.stringify({
        type: "ROOM_INFO",
        payload: roomToSend,
      })
    );
  });
};

const sendError = (user, message) => {
  console.log("send error", message);
  user.send(
    JSON.stringify({
      type: "ERROR_MESSAGE",
      payload: message,
    })
  );
};

const sendSetUsername = (user) => {
  user.send(
    JSON.stringify({
      type: "SET_USERNAME",
      payload: user.username,
    })
  );
};

wss.on("connection", (ws) => {
  setInterval(() => {
    ws.send(
      JSON.stringify({
        type: "PING",
      })
    );
  }, 30000);

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

    if (packet.type === "QUIT_ROOM") {
      const joinedRoom = rooms[ws.roomName];
      if (joinedRoom) {
        ws.send(
          JSON.stringify({
            type: "ROOM_INFO",
            payload: null,
          })
        );
        ws.roomName = undefined;
        const index = joinedRoom.users.findIndex((user) => user === ws);
        joinedRoom.users.splice(index, 1);

        if (joinedRoom.users.length === 0) {
          delete rooms[joinedRoom.roomName];
          return;
        }
        sendRoomDataToAll(joinedRoom);
      }
    }

    if (packet.type === "SET_USERNAME") {
      const username = packet.payload;

      if (!username || username.length < 3) {
        sendError(ws, "Please provide username that is at least 3 chars long.");
        return;
      }

      ws.username = username;

      const joinedRoom = rooms[ws.roomName];
      if (joinedRoom) {
        sendRoomDataToAll(joinedRoom);
      }

      sendSetUsername(ws);
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

      const allVoted = !joinedRoom.users.find(
        (user) => user.uservote === undefined
      );

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
      joinedRoom.users.forEach((user) => (user.uservote = undefined));

      sendRoomDataToAll(joinedRoom);
    }

    if (ws.username && packet.type === "CREATE_ROOM") {
      const { roomName, password } = packet.payload;

      if (roomName.length < 3) {
        sendError(ws, "Room name should have at least 3 characters.");
        return;
      }

      if (rooms[roomName] || rooms[ws.roomName]) {
        sendError(ws, "Room already exists!");
        return;
      }

      ws.roomName = roomName;

      const key = v4();
      console.log({ key });

      const newRoom = {
        roomName,
        password,
        cardsCovered: true,
        lockedVoting: false,
        users: [ws],
        roomKey: key,
      };

      rooms[roomName] = newRoom;

      sendRoomDataToAll(newRoom);
    }

    if (ws.username && packet.type === "JOIN_ROOM") {
      const { roomName, password } = packet.payload;

      if (!rooms[roomName]) {
        sendError(ws, "Room does not exist!");
        return;
      }

      if (rooms[roomName].password !== password) {
        sendError(ws, "Incorrect room password!");
        return;
      }

      if (ws.roomName === roomName) {
        sendError(ws, "You have already joined this room!");
        return;
      }

      ws.roomName = roomName;
      rooms[roomName].users.push(ws);
      sendRoomDataToAll(rooms[roomName]);
    }

    if (ws.username && packet.type === "JOIN_ROOM_VIA_KEY") {
      const { key } = packet.payload;
      const room = Object.values(rooms).find((room) => room.roomKey === key);
      if (room) {
        ws.roomName = room.roomName;
        rooms[room.roomName].users.push(ws);
        sendRoomDataToAll(rooms[room.roomName]);
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
