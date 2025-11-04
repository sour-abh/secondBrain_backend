import express from "express"
import mongoose from 'mongoose' 
import { env } from "./env.js";
import {userRouter} from './auth.js';
import cors from 'cors';

const app=express()
app.use(express.json())
app.use(cors({
  origin: 'http://localhost:5173' // Replace with your frontend URL
}));

const Port=env.PORT

async function main(){
await mongoose.connect(env.DB_CONNECT);
}
main()
app.use("/app/v1", userRouter);

app.listen(Port, console.log(`listening to the port ${env.PORT} `))