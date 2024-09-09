const socket = io();

document.getElementById('sendMessage').addEventListener('click', () => {
    const command = document.getElementById('messageInput').value;
    socket.emit('command', command);
    document.getElementById('messageInput').value = '';
});

socket.on('gameState', (state) => {
    const { rooms, players } = state;
    const player = players[socket.id];
    if (player) {
        const room = rooms[player.room];
        document.getElementById('roomDescription').innerText = `${room.name}: ${room.description}`;
    }
});

socket.on('commandResult', (result) => {
    const messages = document.getElementById('messages');
    const message = document.createElement('div');
    message.innerText = result;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
});

document.getElementById('messageInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const command = event.target.value;
        socket.emit('command', command);
        event.target.value = '';
    }
});
