const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const WORD_POOL_KZ = [
    "Айыппұл", "Кегля", "Журналист", "Баспа", "Сенбі",
    "Күнәһар", "Бағдарламалау", "Бәле", "Сөйлеу", "Үйкеліс",
    "Сия", "Сері", "Күншығыс", "Диктофон", "Тонау",
    "Жолақ", "Борщ", "Терезе", "Тәпішке", "Шомылу",
    "Қате", "Сурет", "Әзіл", "Сұлы", "Алма",
    "Аң аулау", "Наркоз", "Шлагбаум", "Тіс дәрігері", "Ілмек",
    "Циркуль", "Империя", "Полиция", "Жабылу", "Қиял-ғажайып",
    "Тігінші", "Дәстүр", "Перде", "Күзетші", "Шалшық",
    "Мешіт", "Жаңғақ", "Заң", "Сессия", "Планшет",
    "Атқылау", "Дағдарыс", "Актёр", "Ана", "Алаң"
];

const rooms = {};

function createGame() {
    const words = [...WORD_POOL_KZ]
        .sort(() => Math.random() - 0.5)
        .slice(0, 25);

    const colors = [
        ...Array(9).fill("red"),
        ...Array(8).fill("blue"),
        ...Array(7).fill("gray"),
        "black"
    ].sort(() => Math.random() - 0.5);

    return {
        cards: words.map((w, i) => ({
            word: w,
            color: colors[i],
            open: false
        })),
        currentTurn: "red",
        redLeft: 9,
        blueLeft: 8,
        gameOver: false
    };
}

io.on("connection", socket => {

    socket.on("joinRoom", ({ roomId, role, team }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                game: createGame(),
                players: {}
            };
        }

        rooms[roomId].players[socket.id] = { role, team };
        io.to(roomId).emit("state", rooms[roomId].game);
    });

    socket.on("clickCard", ({ roomId, index }) => {
        const room = rooms[roomId];
        if (!room) return;

        const game = room.game;
        const card = game.cards[index];
        if (card.open || game.gameOver) return;

        card.open = true;

        if (card.color === "red") game.redLeft--;
        if (card.color === "blue") game.blueLeft--;

        if (card.color === "black") {
            game.gameOver = true;
        } else if (card.color !== game.currentTurn) {
            game.currentTurn = game.currentTurn === "red" ? "blue" : "red";
        }

        io.to(roomId).emit("state", game);
    });

    socket.on("disconnect", () => {
        for (const r in rooms) {
            delete rooms[r].players[socket.id];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
    console.log("Server running on port", PORT)
);
