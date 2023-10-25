import { createSlice } from "@reduxjs/toolkit";
import { io, Socket } from "socket.io-client";

let userId: number | null = null

function assignuserId() {
    if (userId === null) {
        userId = Math.floor(Math.random() * 3) + 1;
        console.log(`user ID is: ${userId}`)
    }
}

assignuserId()

const socket = io('http://localhost:3001/chat', {
    transports: ['websocket'],
    auth: {
        id: userId,
    },
})

export interface ChatSocketState {
    socket: Socket | null;

}


const initialState: ChatSocketState = {
    socket: socket,
}

const chatSocketSlice = createSlice({
    name: "chatSocket",
    initialState,
    reducers: {
        setSocketState(state, action) {
            state.socket = action.payload;
        },
        getSocketState(state) {
            return state;
        }
    }
})

export const {getSocketState, setSocketState} = chatSocketSlice.actions;
export default chatSocketSlice.reducer;