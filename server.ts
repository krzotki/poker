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
  const address = server.address() as {
    port: number;
  };
  console.log(`Server started at ${address.port}`);
});

const wss = new ws.Server({ server });

type UserType = ws.WebSocket & {
  userData: {
    username?: string;
    idleTimeout?: NodeJS.Timeout;
    isIdling: boolean;
    uservote?: number;
    roomName?: string;
    userId: string;
  };
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

const prepareRoomToSend = (room: RoomType) => {
  return {
    roomName: room.roomName,
    cardsCovered: room.cardsCovered,
    lockedVoting: room.lockedVoting,
    users: room.users.map(({ userData }) => ({
      id: userData.userId,
      name: userData.username,
      hasVoted: userData.uservote !== undefined,
      vote: room.cardsCovered ? null : userData.uservote,
      isIdling: userData.isIdling,
    })),
    key: room.roomKey,
  };
};

const sendRoomDataToAll = (room: RoomType) => {
  const roomToSend = prepareRoomToSend(room);

  room.users.forEach((user) => {
    user.send(
      JSON.stringify({
        type: "ROOM_INFO",
        payload: {
          ...roomToSend,
          userId: user.userData.userId,
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
      payload: user.userData.username,
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
const setIdleTimeout = (ws: UserType) => {
  const { userData } = ws;
  userData.isIdling = false;
  if (userData.roomName) {
    sendRoomDataToAll(rooms[userData.roomName]);
  }
  if (userData.idleTimeout) {
    clearTimeout(userData.idleTimeout);
  }
  userData.idleTimeout = setTimeout(() => {
    if (userData.uservote) {
      return;
    }

    userData.isIdling = true;
    if (userData.roomName) {
      sendRoomDataToAll(rooms[userData.roomName]);
    }
  }, IDLING_TIMEOUT);
};

wss.on("connection", (ws: UserType) => {
  ws.userData = {
    userId: v4(),
    isIdling: false,
  };

  setInterval(() => {
    ws.send(
      JSON.stringify({
        type: "PING",
      })
    );
  }, 30000);

  ws.on("close", () => {
    if (!ws.userData.roomName) {
      return;
    }
    const joinedRoom = rooms[ws.userData.roomName];
    if (joinedRoom) {
      const index = joinedRoom.users.findIndex(
        (user) => user.userData.userId === ws.userData.userId
      );
      joinedRoom.users.splice(index, 1);

      if (joinedRoom.users.length === 0) {
        delete rooms[ws.userData.roomName];
        return;
      }
      sendRoomDataToAll(joinedRoom);
    }
  });

  ws.on("message", (data: string) => {
    const packet = JSON.parse(data);

    if (packet.type !== "PONG") {
      setIdleTimeout(ws);
    }

    if (packet.type === "QUIT_ROOM") {
      const joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
      if (joinedRoom) {
        ws.send(
          JSON.stringify({
            type: "ROOM_INFO",
            payload: null,
          })
        );
        ws.userData.roomName = undefined;
        const index = joinedRoom.users.findIndex(
          (user) => user.userData.userId === ws.userData.userId
        );
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

      ws.userData.username = username;

      const joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
      if (joinedRoom) {
        sendRoomDataToAll(joinedRoom);
      }

      sendSetUsername(ws);
    }

    if (packet.type === "SET_VOTE") {
      const vote = packet.payload;

      ws.userData.uservote = vote;

      const joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
      if (joinedRoom) {
        sendRoomDataToAll(joinedRoom);
      }
    }

    if (packet.type === "UNCOVER_CARDS") {
      const joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
      if (!joinedRoom || joinedRoom.lockedVoting) return;

      const allVoted = !joinedRoom.users.find(
        (user) => user.userData.uservote === undefined
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
      const joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
      if (!joinedRoom || joinedRoom.cardsCovered) return;

      joinedRoom.lockedVoting = false;
      joinedRoom.cardsCovered = true;
      joinedRoom.users.forEach((user) => {
        user.userData.uservote = undefined;
        setIdleTimeout(user);
      });

      sendRoomDataToAll(joinedRoom);
    }

    if (ws.userData.username && packet.type === "CREATE_ROOM") {
      const { roomName, password } = packet.payload;

      if (roomName.length < 3) {
        sendError(ws, "Room name should have at least 3 characters.");
        return;
      }

      if (
        rooms[roomName] ||
        (ws.userData.roomName && rooms[ws.userData.roomName])
      ) {
        sendError(ws, "Room already exists!");
        return;
      }

      ws.userData.roomName = roomName;

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

    if (ws.userData.username && packet.type === "JOIN_ROOM") {
      const { roomName, password } = packet.payload;

      if (!rooms[roomName]) {
        sendError(ws, "Room does not exist!");
        return;
      }

      if (rooms[roomName].password !== password) {
        sendError(ws, "Incorrect room password!");
        return;
      }

      if (ws.userData.roomName === roomName) {
        sendError(ws, "You have already joined this room!");
        return;
      }

      ws.userData.roomName = roomName;
      rooms[roomName].users.push(ws);
      sendRoomDataToAll(rooms[roomName]);
    }

    if (ws.userData.username && packet.type === "JOIN_ROOM_VIA_KEY") {
      const { key } = packet.payload;
      const room = Object.values(rooms).find((room) => room.roomKey === key);
      if (room) {
        ws.userData.roomName = room.roomName;
        rooms[room.roomName].users.push(ws);
        sendRoomDataToAll(rooms[room.roomName]);
      }
    }

    if (packet.type === "WAKE_USER_UP") {
      const room = ws.userData.roomName && rooms[ws.userData.roomName];
      if (room) {
        const { id } = packet.payload;
        const user = room.users.find((user) => user.userData.userId === id);
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
