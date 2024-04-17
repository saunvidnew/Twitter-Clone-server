import { Tweet } from "@prisma/client";
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3'
import { GraphqlContext } from "../../intefaces";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import UserService from "../../services/user";
import TweetService, { CreateTweetPayload } from "../../services/tweet";



const s3Client=new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
});
 

const queries = {
  getAllTweets: () => TweetService.getAllTweets(),
  
  getSignedURLForTweet: async(
    parent:any, 
    {imageType, imageName}: {imageType:string, imageName:string},
    ctx:GraphqlContext
  )=>{
    if(!ctx.user || !ctx.user.id) throw new Error("User is not authenticated");

    const allowedTypes=['image/jpg','image/jpeg', "image/png", "image/webp"];

    if(!allowedTypes.includes(imageType)) throw new Error("Image type is not supported");

    const putObjectCommand=new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET ,
      ContentType: imageType,
      Key: `uploads/${ctx.user.id}/tweets/${imageName}-${Date.now()}.${imageType} `,
    });

    const signeUrl=await getSignedUrl(s3Client,putObjectCommand);

    return signeUrl;
    


  },
};

 

const mutations = {
  createTweet: async (
    parent: any,
    { payload }: { payload: CreateTweetPayload },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user) throw new Error("You are not authenticated");
    const tweet = await TweetService.createTweet({
      ...payload,
      userId: ctx.user.id,
    });
   

    return tweet;
  },
};

const extraResolvers = {
  Tweet: {
    author: (parent: Tweet) =>
       UserService.getCurrentUserById(parent.authorId),
  },
};

export const resolvers = { mutations, extraResolvers, queries };
