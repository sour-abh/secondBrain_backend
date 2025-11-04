
import express from 'express';
import {z} from 'zod';
import * as bcrypt from 'bcrypt'
import { env } from "./env.js";
import {ContentModel, LinkModel, UserModel} from './db.js';
import  jwt, { type JwtPayload}  from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { Types } from 'mongoose';
import { random } from './util.js';
import type { AxiosError } from 'axios';

const saltrounds:number = 10;

async function auth(
  req: Request & { userId  ?: Types.ObjectId},
  res: Response,
  next: NextFunction
) {
  const tokenSchema = z.object({
    token: z.string().min(1),
  });
  const token = tokenSchema.parse({token:req.headers.authorization});
  const userToken = token.token;

  if (!userToken) {
    res.json({ message: "Token not Found" });
  }

  try {
    function hasId(p: string | JwtPayload): p is JwtPayload & { id: string } {
      return (
        typeof p !== "string" &&
        p !== null &&
        "id" in p &&
        typeof (p as any).id === "string"
      );
    }

    const payload = jwt.verify(userToken.split(" ")[1] ?? "", env.JWT_SECRET);
    if(!payload){
      return res.json({message:"payload error"})
    }
    if (!hasId(payload)) {
      throw new Error("Invalid token payload");
    }
    const user = await UserModel.findById(payload.id);
    if (user) {
      req.userId = user._id;
      next();
    } else {
      return res.json({ message: "user not found" });
    }
  } catch {
    res.json({ message: "authentication error occured" });
  }
}
async function signup(req:Request,res:Response){
    const requiredBody = z.object({
      email: z.email(),
      name: z.string().min(3).max(100),
      password: z.string().min(8).max(100).refine((val) =>
            /[A-Z]/.test(val) &&
            /[a-z]/.test(val) &&
            /[0-9]/.test(val) &&
            /[^A-Za-z0-9]/.test(val),
          {
            error:
              "message please include a symbol a uppercase letter and lower case letter ",
          }
        )
    });
    const parsedWithSuccess=requiredBody.parse(req.body)
    if(!parsedWithSuccess){
        res.json({message:"incorrect data format"})
        return 
    }
    const email=req.body.email;
    const password=req.body.password;
    const name=req.body.name

    const user=await UserModel.findOne({email:email})
    if(!user){
        try{
            bcrypt.genSalt(saltrounds,async function(err,salt){
                bcrypt.hash(password,salt,async function(err,hash){
                    await UserModel.create({
                        email:email,
                        name:name,
                        password:hash
                    })

                })

            })

        }catch (e){
            console.log("error ",e)

        }
        res.json({message:"you have signed up successfully,pls login"})
        console.log('you have signed up successfully')
    }else{
        res.status(403)
        res.json({message:"already signedUp"})
        return
    }
    
}

async function login(req:Request,res:Response){
    const email=req.body.email;
    const password=req.body.password;

    const user=await UserModel.findOne({email:email})
    const safeuser = await UserModel.findOne({ email: email }).select("-password")
    if(user){
        const hash = user?.password;
        if (typeof hash === 'string') {
          bcrypt.compare(password, hash, async function(err, result){
            if(result){
              const token = jwt.sign({id:user._id}, env.JWT_SECRET) 
              
              res.json({message:"you have successfully logged in ", token:token,user:safeuser})
            } else {
              res.json({message:"incorrect login credentials"})
            }
          })
        } else {
          res.json({message:"incorrect login credentials during hash"})
        }
    }else{
      res.status(403)
      res.json({message:"user not found"})
    }
    
}

async function showContent(req:Request&{ userId  ?: Types.ObjectId} ,res:Response){
  const userId=req.userId  
try {
    const posts=await ContentModel.find({userId:userId}).populate("userId","name email")
    if(posts){
      res.json({message:"successfully fetched the posts",posts:posts})
  
    }else{
      res.json({message:"posts not found error occured"})
    }
} catch (error) {
  console.log("no content found")
  console.log('error',error)
}
}
async function createPost(req:Request&{userId?:Types.ObjectId},res:Response){
  const userId=req.userId;
  const link=req.body.link;
  const type=req.body.type;
  const title=req.body.title;
  const tags=req.body.tags;
  const time=new Date()
  try{
    const user= await UserModel.findOne({'_id':userId})
    if(user){
      const createdPost= await ContentModel.create({
        userId:userId,
        link:link,
        title:title,
        type:type,
        tags:tags,
        time:time,
      })
      return res.status(201).json({message:"post added successfully",post:createdPost})
      
    }

  }catch(error){
    if (error instanceof Error) {
      
    
    if (String(error && error.name) === "ValidationError") {
      res
        .status(400)
        .json({ message: "Validation error", error: error.message});
    } else {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
    }
  }
}
async function deletePost(
  req: Request & { userId?: Types.ObjectId },
  res: Response
) {
  const id = req.params.id;
  const userId=req.userId;
  try {
    const post = await ContentModel.findById(id);

    if (post) {
      await ContentModel.deleteOne({ _id: id ,userId:userId});
    } else {
      return res.json({ message: "post not found" });
    }
    res.json({ message: "content deleted successfully" });
  } catch (error) {
    res.json({ message: "error deleting the post " });
  }
}
async function updatePost(
  req: Request & { userId?: Types.ObjectId },
  res: Response
) {
  const id = req.params.id;
  const userId=req.userId;
  const updatedPost = req.body;   
  if (!updatedPost || typeof updatedPost !== "object") {
    res.status(400).json({ message: "No update data sent." });
    return;
  }
  try {
    const post = await ContentModel.findById(id);

    if (post) {
      const cleanedData = Object.fromEntries(
        Object.entries(updatedPost).filter(
          ([_, value]) => value !== undefined && value !== null
        )
      );
      if (Object.keys(cleanedData).length === 0) {
        throw new Error("No valid update data provided");
      }
      try {
        await ContentModel.updateOne({ _id: id,userId:userId }, { $set: cleanedData });
        res.json({ message: "content is updated successfully" });
      } catch (error) {
        res.json({ message: " some error occured", error: error });
      }
    } else {
      res.json({ message: "post not found" });
    }
  } catch (error) {
    console.log("error : ", error);
    res.json({ message: "error during updating post" });
  }
}

async function share(
  req: Request & { userId?: Types.ObjectId },
  res: Response
) {
  const share=req.body.share;
  if(share){
    const existingLink=await LinkModel.findOne({
      userId:req.userId
    })
    if(existingLink){  
      res.json({ message: "link already created" ,hash:existingLink.hash});
      return; 
      }
    else{
      try {
        const hash = random(10);
        await LinkModel.create({
          hash,
          userId: req.userId,
        });
        res.json({ hash });
      } catch (error) {
        res.json({message:"some error occured"})
      } 
      
    }

  }else{
    await LinkModel.deleteOne({
      userId:req.userId
    })
  }
  res.json({message:"deleted shared Link"})
}
async function shareLink(
  req: Request & { userId?: Types.ObjectId },
  res: Response
) {
  const hash=req.params.hash
  try{
    const link=await LinkModel.findOne({hash})
    if(link){
      const userId=link.userId
      if(!userId){
        res.json({message:"userId not found"})
        return
      }else{
        const user=await UserModel.findById(userId)
        if(!user){
          res.status(411).json({
            message:"user not found"
          })
          return
        }
        const content=await ContentModel.find({userId:userId})
        if(!content){
          res.status(411).json({
            message:"some error occurred during content fetching"
          })
          return
        }
        res.json({ userName:user.email,content,message:"successsfully fetched"})
      }
    }else{
      res.json({message:"link not found"})
      return
    }

  }catch{

  }
}
const userRouter=express.Router()
userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.get("/user/content", auth, showContent);
userRouter.post("/user/create/post",auth,createPost);
userRouter.delete("/user/delete/:id",auth,deletePost);
userRouter.patch("/user/update/:id",auth,updatePost);
userRouter.post("/share", auth,share);
userRouter.get("/sharelink/:hash",shareLink);

export{userRouter}