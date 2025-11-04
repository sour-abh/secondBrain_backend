import { triggerAsyncId } from 'async_hooks';
import { time } from 'console';
import mongoose, { Types } from 'mongoose'
import { ref } from 'process';
import { required } from 'zod/mini';
const Schema=mongoose.Schema;
const ObjectId=Schema.ObjectId;

const User = new Schema({
    name:String,
    password:{type:String,required:true},
    email:{type:String,unique:true,required:true}
})

const contentTypes=['image','video','article','audio','text','youtube','twitter']

const Content = new Schema({
  link: {type:String,required:true},
  type: { type:String,enum:contentTypes, required:true },
  title:{ type:String,required:true},
  tags: [{ type:ObjectId,ref:'tags' }],
  userId: { type: ObjectId, ref: "users",required:true },
  shareableLink:{type:String},
  time:{type:String,required:true}
});
 
const Link=new Schema({
    hash:{type:String,required:true},
    userId:{type:ObjectId, ref:'users',required:true,unique:true}
})
const Tags=new Schema({
    title:{type:String,required:true,unique:true}
})

const UserModel=mongoose.model('users',User)
const TagsModel=mongoose.model('tags',Tags)
const LinkModel=mongoose.model('links',Link)
const ContentModel=mongoose.model('contents',Content)


export { UserModel, TagsModel, LinkModel, ContentModel };
