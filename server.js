const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

let players = {};
let rooms = {
    lobby: { name: 'Lobby', description: 'The central hub of the office.', players: [], containers: { 'first-aid kit': [] } },
    janitorsCloset: { name: "Janitor's Closet", description: 'A small, cramped room filled with cleaning supplies.', players: [], containers: { 'shelves': [] } },
    secretaryOffice: { name: "Secretary's Office", description: 'A tidy office with a locked door leading to the director\'s office.', players: [], containers: { 'desk': [] } },
    breakroom: { name: 'Breakroom', description: 'A place to relax and have a snack.', players: [], containers: { 'fridge': [], 'cabinet': [] } },
    securityRoom: { name: 'Security Room', description: 'A locked room with security monitors.', players: [], containers: { 'locker': [] } }
};

const lootTables = {
    lobby: ['Bandage', 'Suture Needle', 'Splint', 'Tweezers'],
    janitorsCloset: ['Pipe Wrench', 'Crowbar', 'Bandage'],
    secretaryOffice: ['Pen', 'Notebook', 'Sticky Note'],
    breakroom: ['Sandwich', 'Coffee Mug', 'Napkin'],
    securityRoom: ['Nightstick', 'Bandage', 'Tweezers']
};

function spawnLoot() {
    for (const roomName in rooms) {
        const room = rooms[roomName];
        for (const containerName in room.containers) {
            const lootTable = lootTables[roomName];
            const lootCount = Math.floor(Math.random() * 3) + 1; // Randomly spawn 1 to 3 items
            for (let i = 0; i < lootCount; i++) {
                const item = lootTable[Math.floor(Math.random() * lootTable.length)];
                room.containers[containerName].push(item);
            }
        }
    }
    // Ensure the first aid kit in the lobby is filled with first aid supplies
    rooms.lobby.containers['first-aid kit'] = ['Bandage', 'Suture Needle', 'Splint', 'Tweezers'];
}

spawnLoot();

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    socket.on('joinGame', (playerName) => {
        players[socket.id] = { name: playerName, room: 'lobby', inventory: [], health: 100, cubicle: { items: [] } };
        rooms.lobby.players.push(socket.id);
        socket.join('lobby');
        io.to(socket.id).emit('gameState', { rooms, players });
        io.to(socket.id).emit('commandResult', `Welcome to Monotony, ${playerName}! You are currently in the Lobby.`);
    });

    socket.on('moveToRoom', (roomName) => {
        const player = players[socket.id];
        if (player) {
            const currentRoom = rooms[player.room];
            const newRoom = rooms[roomName];
            if (currentRoom && newRoom) {
                currentRoom.players = currentRoom.players.filter(id => id !== socket.id);
                newRoom.players.push(socket.id);
                player.room = roomName;
                socket.leave(currentRoom.name);
                socket.join(newRoom.name);
                io.to(socket.id).emit('gameState', { rooms, players });
                io.to(socket.id).emit('commandResult', `You moved to ${newRoom.name}.`);
            } else {
                io.to(socket.id).emit('commandResult', `Cannot move to ${roomName}.`);
            }
        }
    });

    socket.on('command', (command) => {
        const player = players[socket.id];
        if (player) {
            let result = '';
            const [action, ...args] = command.toLowerCase().split(' ');
            switch (action) {
                case 'view':
                    if (args[0] === 'inventory') {
                        result = `Inventory: ${player.inventory.length > 0 ? player.inventory.join(', ') : 'Your inventory is empty.'}`;
                    } else if (args[0] === 'cubicle') {
                        result = `Cubicle: ${player.cubicle.items.length > 0 ? player.cubicle.items.join(', ') : 'Your cubicle is empty.'}`;
                    }
                    break;
                case 'health':
                    if (args[0] === 'check') {
                        result = `Health: ${player.health}`;
                    }
                    break;
                case 'look':
                    if (args[0] === 'around') {
                        const room = rooms[player.room];
                        result = `${room.name}: ${room.description}\nPlayers here: ${room.players.length > 1 ? room.players.map(id => players[id].name).join(', ') : 'No one else is here.'}\nContainers: ${Object.keys(room.containers).join(', ')}`;
                    }
                    break;
                case 'open':
                    const containerName = args.join(' ');
                    const room = rooms[player.room];
                    if (room.containers[containerName]) {
                        result = `${containerName} contains: ${room.containers[containerName].length > 0 ? room.containers[containerName].join(', ') : 'The container is empty.'}`;
                    } else {
                        result = `There is no container named ${containerName} here.`;
                    }
                    break;
                default:
                    result = 'Unknown command. Please try again.';
            }
            io.to(socket.id).emit('commandResult', result);
        }
    });

    socket.on('disconnect', () => {
        console.log('A player disconnected:', socket.id);
        const player = players[socket.id];
        if (player) {
            const room = rooms[player.room];
            if (room) {
                room.players = room.players.filter(id => id !== socket.id);
            }
            delete players[socket.id];
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
