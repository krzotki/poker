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
    console.log("Server started");
});
var wss = new ws.Server({ server: server });
var rooms = {};
var prepareRoomToSend = function (room, user) {
    return {
        roomName: room.roomName,
        cardsCovered: room.cardsCovered,
        lockedVoting: room.lockedVoting,
        users: room.users.map(function (user) { return ({
            id: user.userId,
            name: user.username,
            hasVoted: user.uservote !== undefined,
            vote: room.cardsCovered ? null : user.uservote,
            isIdling: user.isIdling
        }); }),
        key: room.roomKey
    };
};
var sendRoomDataToAll = function (room, user) {
    var roomToSend = prepareRoomToSend(room, user);
    room.users.forEach(function (user) {
        user.send(JSON.stringify({
            type: "ROOM_INFO",
            payload: __assign(__assign({}, roomToSend), { userId: user.userId })
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
        payload: user.username
    }));
};
var sendWakeUp = function (user) {
    user.send(JSON.stringify({
        type: "WAKE_UP"
    }));
};
var IDLING_TIMEOUT = 10000;
wss.on("connection", function (ws) {
    ws.userId = (0, uuid_1.v4)();
    setInterval(function () {
        ws.send(JSON.stringify({
            type: "PING"
        }));
    }, 30000);
    ws.on("close", function () {
        if (!ws.roomName) {
            return;
        }
        var joinedRoom = rooms[ws.roomName];
        if (joinedRoom) {
            var index = joinedRoom.users.findIndex(function (user) { return user === ws; });
            joinedRoom.users.splice(index, 1);
            if (joinedRoom.users.length === 0) {
                delete rooms[ws.roomName];
                return;
            }
            sendRoomDataToAll(joinedRoom, ws);
        }
    });
    ws.on("message", function (data) {
        var packet = JSON.parse(data);
        if (packet.type !== "PONG") {
            ws.isIdling = false;
            if (ws.roomName) {
                sendRoomDataToAll(rooms[ws.roomName], ws);
            }
            if (ws.idleTimeout) {
                clearTimeout(ws.idleTimeout);
            }
            ws.idleTimeout = setTimeout(function () {
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
            var joinedRoom = ws.roomName && rooms[ws.roomName];
            if (joinedRoom) {
                ws.send(JSON.stringify({
                    type: "ROOM_INFO",
                    payload: null
                }));
                ws.roomName = undefined;
                var index = joinedRoom.users.findIndex(function (user) { return user === ws; });
                joinedRoom.users.splice(index, 1);
                if (joinedRoom.users.length === 0) {
                    delete rooms[joinedRoom.roomName];
                    return;
                }
                sendRoomDataToAll(joinedRoom, ws);
            }
        }
        if (packet.type === "SET_USERNAME") {
            var username = packet.payload;
            if (!username || username.length < 3) {
                sendError(ws, "Please provide username that is at least 3 chars long.");
                return;
            }
            ws.username = username;
            var joinedRoom = ws.roomName && rooms[ws.roomName];
            if (joinedRoom) {
                sendRoomDataToAll(joinedRoom, ws);
            }
            sendSetUsername(ws);
        }
        if (packet.type === "SET_VOTE") {
            var vote = packet.payload;
            ws.uservote = vote;
            var joinedRoom = ws.roomName && rooms[ws.roomName];
            if (joinedRoom) {
                sendRoomDataToAll(joinedRoom, ws);
            }
        }
        if (packet.type === "UNCOVER_CARDS") {
            var joinedRoom_1 = ws.roomName && rooms[ws.roomName];
            if (!joinedRoom_1 || joinedRoom_1.lockedVoting)
                return;
            var allVoted = !joinedRoom_1.users.find(function (user) { return user.uservote === undefined; });
            if (allVoted) {
                joinedRoom_1.lockedVoting = true;
                sendRoomDataToAll(joinedRoom_1, ws);
                setTimeout(function () {
                    joinedRoom_1.cardsCovered = false;
                    sendRoomDataToAll(joinedRoom_1, ws);
                }, 3000);
            }
        }
        if (packet.type === "RESET_VOTING") {
            var joinedRoom = ws.roomName && rooms[ws.roomName];
            if (!joinedRoom || joinedRoom.cardsCovered)
                return;
            joinedRoom.lockedVoting = false;
            joinedRoom.cardsCovered = true;
            joinedRoom.users.forEach(function (user) { return (user.uservote = undefined); });
            sendRoomDataToAll(joinedRoom, ws);
        }
        if (ws.username && packet.type === "CREATE_ROOM") {
            var _a = packet.payload, roomName = _a.roomName, password = _a.password;
            if (roomName.length < 3) {
                sendError(ws, "Room name should have at least 3 characters.");
                return;
            }
            if (rooms[roomName] || (ws.roomName && rooms[ws.roomName])) {
                sendError(ws, "Room already exists!");
                return;
            }
            ws.roomName = roomName;
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
            sendRoomDataToAll(newRoom, ws);
        }
        if (ws.username && packet.type === "JOIN_ROOM") {
            var _b = packet.payload, roomName = _b.roomName, password = _b.password;
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
            var key_1 = packet.payload.key;
            var room = Object.values(rooms).find(function (room) { return room.roomKey === key_1; });
            if (room) {
                ws.roomName = room.roomName;
                rooms[room.roomName].users.push(ws);
                sendRoomDataToAll(rooms[room.roomName], ws);
            }
        }
        if (packet.type === "WAKE_USER_UP") {
            var room = ws.roomName && rooms[ws.roomName];
            if (room) {
                var id_1 = packet.payload.id;
                var user = room.users.find(function (user) { return user.userId === id_1; });
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
