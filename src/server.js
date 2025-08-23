// src/server.js
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

// create an HTTP server from the express app
const server = http.createServer(app);

// create socket.io server
const io = new Server(server, {
  cors: {
    origin: "*", // for development. Change this to your frontend URL in production.
    methods: ["GET", "POST"]
  }
});

// attach io to app so controllers can access it via req.app.get("io")
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
