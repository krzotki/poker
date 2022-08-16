"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var express = require("express");
var http = require("http");
var ws = require("ws");
var uuid_1 = require("uuid");
var app = express();
var server = http.createServer(app);
app.get("/", function (req, res) {
    res.sendFile(__dirname + "/build/index.html");
});
app.use("/", express.static(__dirname + "/build/"));
server.listen(process.env.PORT || 8080, function () {
    var address = server.address();
    console.log("Server started at ".concat(address.address, ":").concat(address.port));
});
var wss = new ws.Server({ server: server });
var rooms = {};
var prepareRoomToSend = function (room) {
    return {
        roomName: room.roomName,
        cardsCovered: room.cardsCovered,
        lockedVoting: room.lockedVoting,
        users: room.users.map(function (_a) {
            var userData = _a.userData;
            return ({
                id: userData.userId,
                name: userData.username,
                hasVoted: userData.uservote !== undefined,
                vote: room.cardsCovered ? null : userData.uservote,
                isIdling: userData.isIdling
            });
        }),
        key: room.roomKey
    };
};
var sendRoomDataToAll = function (room) {
    var roomToSend = prepareRoomToSend(room);
    room.users.forEach(function (user) {
        user.send(JSON.stringify({
            type: "ROOM_INFO",
            payload: __assign(__assign({}, roomToSend), { userId: user.userData.userId })
        }));
    });
};
var sendError = function (user, message) {
    console.log("send error", message);
    user.send(JSON.stringify({
        type: "ERROR_MESSAGE",
        payload: message
    }));
};
var sendSetUsername = function (user) {
    user.send(JSON.stringify({
        type: "SET_USERNAME",
        payload: user.userData.username
    }));
};
var sendWakeUp = function (user) {
    user.send(JSON.stringify({
        type: "WAKE_UP"
    }));
};
var IDLING_TIMEOUT = 10000;
var setIdleTimeout = function (ws) {
    var userData = ws.userData;
    userData.isIdling = false;
    if (userData.roomName) {
        sendRoomDataToAll(rooms[userData.roomName]);
    }
    if (userData.idleTimeout) {
        clearTimeout(userData.idleTimeout);
    }
    userData.idleTimeout = setTimeout(function () {
        if (userData.uservote) {
            return;
        }
        userData.isIdling = true;
        if (userData.roomName) {
            sendRoomDataToAll(rooms[userData.roomName]);
        }
    }, IDLING_TIMEOUT);
};
wss.on("connection", function (ws) {
    ws.userData = {
        userId: (0, uuid_1.v4)(),
        isIdling: false
    };
    setInterval(function () {
        ws.send(JSON.stringify({
            type: "PING"
        }));
    }, 30000);
    ws.on("close", function () {
        if (!ws.userData.roomName) {
            return;
        }
        var joinedRoom = rooms[ws.userData.roomName];
        if (joinedRoom) {
            var index = joinedRoom.users.findIndex(function (user) { return user.userData.userId === ws.userData.userId; });
            joinedRoom.users.splice(index, 1);
            if (joinedRoom.users.length === 0) {
                delete rooms[ws.userData.roomName];
                return;
            }
            sendRoomDataToAll(joinedRoom);
        }
    });
    ws.on("message", function (data) {
        var packet = JSON.parse(data);
        if (packet.type !== "PONG") {
            setIdleTimeout(ws);
        }
        if (packet.type === "QUIT_ROOM") {
            var joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
            if (joinedRoom) {
                ws.send(JSON.stringify({
                    type: "ROOM_INFO",
                    payload: null
                }));
                ws.userData.roomName = undefined;
                var index = joinedRoom.users.findIndex(function (user) { return user.userData.userId === ws.userData.userId; });
                joinedRoom.users.splice(index, 1);
                if (joinedRoom.users.length === 0) {
                    delete rooms[joinedRoom.roomName];
                    return;
                }
                sendRoomDataToAll(joinedRoom);
            }
        }
        if (packet.type === "SET_USERNAME") {
            var username = packet.payload;
            if (!username || username.length < 3) {
                sendError(ws, "Please provide username that is at least 3 chars long.");
                return;
            }
            ws.userData.username = username;
            var joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
            if (joinedRoom) {
                sendRoomDataToAll(joinedRoom);
            }
            sendSetUsername(ws);
        }
        if (packet.type === "SET_VOTE") {
            var vote = packet.payload;
            ws.userData.uservote = vote;
            var joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
            if (joinedRoom) {
                sendRoomDataToAll(joinedRoom);
            }
        }
        if (packet.type === "UNCOVER_CARDS") {
            var joinedRoom_1 = ws.userData.roomName && rooms[ws.userData.roomName];
            if (!joinedRoom_1 || joinedRoom_1.lockedVoting)
                return;
            var allVoted = !joinedRoom_1.users.find(function (user) { return user.userData.uservote === undefined; });
            if (allVoted) {
                joinedRoom_1.lockedVoting = true;
                sendRoomDataToAll(joinedRoom_1);
                setTimeout(function () {
                    joinedRoom_1.cardsCovered = false;
                    sendRoomDataToAll(joinedRoom_1);
                }, 3000);
            }
        }
        if (packet.type === "RESET_VOTING") {
            var joinedRoom = ws.userData.roomName && rooms[ws.userData.roomName];
            if (!joinedRoom || joinedRoom.cardsCovered)
                return;
            joinedRoom.lockedVoting = false;
            joinedRoom.cardsCovered = true;
            joinedRoom.users.forEach(function (user) {
                user.userData.uservote = undefined;
                setIdleTimeout(user);
            });
            sendRoomDataToAll(joinedRoom);
        }
        if (ws.userData.username && packet.type === "CREATE_ROOM") {
            var _a = packet.payload, roomName = _a.roomName, password = _a.password;
            if (roomName.length < 3) {
                sendError(ws, "Room name should have at least 3 characters.");
                return;
            }
            if (rooms[roomName] ||
                (ws.userData.roomName && rooms[ws.userData.roomName])) {
                sendError(ws, "Room already exists!");
                return;
            }
            ws.userData.roomName = roomName;
            var key = (0, uuid_1.v4)();
            console.log({ key: key });
            var newRoom = {
                roomName: roomName,
                password: password,
                cardsCovered: true,
                lockedVoting: false,
                users: [ws],
                roomKey: key
            };
            rooms[roomName] = newRoom;
            sendRoomDataToAll(newRoom);
        }
        if (ws.userData.username && packet.type === "JOIN_ROOM") {
            var _b = packet.payload, roomName = _b.roomName, password = _b.password;
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
            var key_1 = packet.payload.key;
            var room = Object.values(rooms).find(function (room) { return room.roomKey === key_1; });
            if (room) {
                ws.userData.roomName = room.roomName;
                rooms[room.roomName].users.push(ws);
                sendRoomDataToAll(rooms[room.roomName]);
            }
        }
        if (packet.type === "WAKE_USER_UP") {
            var room = ws.userData.roomName && rooms[ws.userData.roomName];
            if (room) {
                var id_1 = packet.payload.id;
                var user = room.users.find(function (user) { return user.userData.userId === id_1; });
                if (user) {
                    sendWakeUp(user);
                }
            }
        }
        if (packet.type === "MESSAGE") {
            wss.clients.forEach(function (client) {
                client.send(JSON.stringify({
                    type: "MESSAGE",
                    payload: packet.payload
                }));
            });
        }
    });
});
