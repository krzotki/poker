import * as express from "express";
import * as http from "http";
import * as ws from "ws";
import { v4 } from "uuid";

const app = express();
const server = http.createServer(app);

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/build/index.html");
});

app.use("/", express.static(__dirname + "/build/"));

server.listen(process.env.PORT || 8080, () => {
  const address = server.address();
  console.log(`Server started`);
});

const wss = new ws.Server({ server });

type UserType = ws.WebSocket & {
  username: string;
  idleTimeout: NodeJS.Timeout;
  isIdling: boolean;
  uservote?: number;
  roomName?: string;
  userId: string;
};

type RoomType = {
  roomName: string;
  password: string;
  cardsCovered: boolean;
  lockedVoting: boolean;
  users: UserType[];
  roomKey: string;
};

const rooms: Record<string, RoomType> = {};

const prepareRoomToSend = (room: RoomType, user: UserType) => {
  return {
    roomName: room.roomName,
    cardsCovered: room.cardsCovered,
    lockedVoting: room.lockedVoting,
    users: room.users.map((user) => ({
      id: user.userId,
      name: user.username,
      hasVoted: user.uservote !== undefined,
      vote: room.cardsCovered ? null : user.uservote,
      isIdling: user.isIdling,
    })),
    key: room.roomKey,
  };
};

const sendRoomDataToAll = (room: RoomType, user: UserType) => {
  const roomToSend = prepareRoomToSend(room, user);

  room.users.forEach((user) => {
    user.send(
      JSON.stringify({
        type: "ROOM_INFO",
        payload: {
          ...roomToSend,
          userId: user.userId,
        },
      })
    );
  });
};

const sendError = (user: UserType, message: string) => {
  console.log("send error", message);
  user.send(
    JSON.stringify({
      type: "ERROR_MESSAGE",
      payload: message,
    })
  );
};

const sendSetUsername = (user: UserType) => {
  user.send(
    JSON.stringify({
      type: "SET_USERNAME",
      payload: user.username,
    })
  );
};

const sendWakeUp = (user: UserType) => {
  user.send(
    JSON.stringify({
      type: "WAKE_UP",
    })
  );
};

const IDLING_TIMEOUT = 10000;

wss.on("connection", (ws: UserType) => {
  ws.userId = v4();

  setInterval(() => {
    ws.send(
      JSON.stringify({
        type: "PING",
      })
    );
  }, 30000);

  ws.on("close", () => {
    if (!ws.roomName) {
      return;
    }
    const joinedRoom = rooms[ws.roomName];
    if (joinedRoom) {
      const index = joinedRoom.users.findIndex((user) => user === ws);
      joinedRoom.users.splice(index, 1);

      if (joinedRoom.users.length === 0) {
        delete rooms[ws.roomName];
        return;
      }
      sendRoomDataToAll(joinedRoom, ws);
    }
  });

  ws.on("message", (data: string) => {
    const packet = JSON.parse(data);

    if (packet.type !== "PONG") {
      ws.isIdling = false;
      if (ws.roomName) {
        sendRoomDataToAll(rooms[ws.roomName], ws);
      }
      if (ws.idleTimeout) {
        clearTimeout(ws.idleTimeout);
      }
      ws.idleTimeout = setTimeout(() => {
        if (ws.uservote) {
          return;
        }

        ws.isIdling = true;
        if (ws.roomName) {
          sendRoomDataToAll(rooms[ws.roomName], ws);
        }
      }, IDLING_TIMEOUT);
    }

    if (packet.type === "QUIT_ROOM") {
      const joinedRoom = ws.roomName && rooms[ws.roomName];
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
        sendRoomDataToAll(joinedRoom, ws);
      }
    }

    if (packet.type === "SET_USERNAME") {
      const username = packet.payload;

      if (!username || username.length < 3) {
        sendError(ws, "Please provide username that is at least 3 chars long.");
        return;
      }

      ws.username = username;

      const joinedRoom = ws.roomName && rooms[ws.roomName];
      if (joinedRoom) {
        sendRoomDataToAll(joinedRoom, ws);
      }

      sendSetUsername(ws);
    }

    if (packet.type === "SET_VOTE") {
      const vote = packet.payload;

      ws.uservote = vote;

      const joinedRoom = ws.roomName && rooms[ws.roomName];
      if (joinedRoom) {
        sendRoomDataToAll(joinedRoom, ws);
      }
    }

    if (packet.type === "UNCOVER_CARDS") {
      const joinedRoom = ws.roomName && rooms[ws.roomName];
      if (!joinedRoom || joinedRoom.lockedVoting) return;

      const allVoted = !joinedRoom.users.find(
        (user) => user.uservote === undefined
      );

      if (allVoted) {
        joinedRoom.lockedVoting = true;
        sendRoomDataToAll(joinedRoom, ws);

        setTimeout(() => {
          joinedRoom.cardsCovered = false;
          sendRoomDataToAll(joinedRoom, ws);
        }, 3000);
      }
    }

    if (packet.type === "RESET_VOTING") {
      const joinedRoom = ws.roomName && rooms[ws.roomName];
      if (!joinedRoom || joinedRoom.cardsCovered) return;

      joinedRoom.lockedVoting = false;
      joinedRoom.cardsCovered = true;
      joinedRoom.users.forEach((user) => (user.uservote = undefined));

      sendRoomDataToAll(joinedRoom, ws);
    }

    if (ws.username && packet.type === "CREATE_ROOM") {
      const { roomName, password } = packet.payload;

      if (roomName.length < 3) {
        sendError(ws, "Room name should have at least 3 characters.");
        return;
      }

      if (rooms[roomName] || (ws.roomName && rooms[ws.roomName])) {
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

      sendRoomDataToAll(newRoom, ws);
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
      sendRoomDataToAll(rooms[roomName], ws);
    }

    if (ws.username && packet.type === "JOIN_ROOM_VIA_KEY") {
      const { key } = packet.payload;
      const room = Object.values(rooms).find((room) => room.roomKey === key);
      if (room) {
        ws.roomName = room.roomName;
        rooms[room.roomName].users.push(ws);
        sendRoomDataToAll(rooms[room.roomName], ws);
      }
    }

    if (packet.type === "WAKE_USER_UP") {
      const room = ws.roomName && rooms[ws.roomName];
      if (room) {
        const { id } = packet.payload;
        const user = room.users.find((user) => user.userId === id);
        if (user) {
          sendWakeUp(user);
        }
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
