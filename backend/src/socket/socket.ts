import http from "http";
import { Server } from "socket.io";
import app from "../app";
import { chatModel } from "../dbs/init.mongodb";
import ChatService from "../services/chat.service";
import WebSocket from "ws";

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const ws = new WebSocket("ws://127.0.0.1:8000/api/v1/chat/ws/generate");

var userSocketMap: any = {};

io.on("connection", (frontendSocket) => {
  ws.onopen = () => {
    const userId: any = frontendSocket.handshake.query.userId;
    if (userId) {
      userSocketMap[userId] = frontendSocket.id;
    }

    frontendSocket.on(
      "newMessage",
      async ({
        conversationId,
        msg,
      }: {
        conversationId: string;
        msg: string;
      }) => {
        const conversation = chatModel.getConversationById(conversationId);

        if (conversation) {
          if (conversation.autoMode && userId != "LKM4602") {
            await ChatService.sendMessage({
              senderId: userId,
              conversationId: conversationId,
              messageContent: msg,
            });

            await ChatService.generateChat(conversationId);

            // await ChatService.sendMessage({
            //   senderId: "LKM4602_BOT",
            //   conversationId: conversationId,
            //   messageContent: generateMessage,
            // });
          } else {
            await ChatService.sendMessage({
              senderId: userId,
              conversationId: conversationId,
              messageContent: msg,
            });
            // if (userId != "LKM4602") {
            //   const generateMessage = await ChatService.generateChat(
            //     conversationId
            //   );
            //   socket.to(userSocketMap["LKM4602"]).emit("suggestMessage", {
            //     conversationId,
            //     generateMessage,
            //   });
            // }
          }
        }
      }
    );

    frontendSocket.on(
      "toggleAutoChat",
      ({
        conversationId,
        autoChat,
      }: {
        conversationId: string;
        autoChat: boolean;
      }) => {
        const conversation = chatModel.getConversationById(conversationId);

        if (conversation) {
          conversation.autoMode = autoChat;
        }
      }
    );

    frontendSocket.on("disconnected", () => {
      console.log("user disconnected", frontendSocket.id);
    });

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  };
});

export const getReceiverSocketId = (userId: string) => {
  return userSocketMap[userId];
};

export { httpServer, io, app, ws };
