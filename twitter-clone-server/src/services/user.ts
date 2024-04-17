import axios from "axios";
import { prismaClient } from "../clients/db";
import JWTService from "./jwt";
import { redisClient } from "../clients/redis";

interface GoogleTokenResult {
    iss?: string;
    nbf?: string;
    aud?: string;
    sub?: string;
    email: string;
    email_verified: string;
    azp?: string;
    name?: string;
    picture?: string;
    given_name: string;
    family_name?: string;
    iat?: string;
    exp?: string;
    jti?: string;
    alg?: string;
    kid?: string;
    typ?: string;
  }

class UserService{
    public static async verifyGoogleToken(token:string){
    const googleToken = token;
    const googleOauthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
    googleOauthURL.searchParams.set("id_token", googleToken);

    const { data } = await axios.get<GoogleTokenResult>(
      googleOauthURL.toString(),
      {
        responseType: "json",
      }
    );

    const user = await prismaClient.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      await prismaClient.user.create({
        data: {
          email: data.email,
          firstName: data.given_name,
          lastName: data.family_name,
          profileImageURL: data.picture,
        },
      });
      
    }

    const userInDb = await prismaClient.user.findUnique({
      where: { email: data.email },
    });

    if (!userInDb) throw new Error("User with email not found");

    const userToken = JWTService.generateTokenForUser(userInDb);

    return userToken;
  };

  public static async getCurrentUserById(id:string){
    
    // const cachedUserId= await redisClient.get('user_Id')
    // if(cachedUserId) return JSON.parse(cachedUserId);

    const userId=await prismaClient.user.findUnique({ where: { id } });
    
    // await redisClient.set('user_Id',JSON.stringify(userId));
    return userId;

   

  };

  public static async followUser(from:string, to:string){
    const followUser=  prismaClient.follows.create({
      data:{
        follower: {connect: {id: from}},
        following: {connect: {id: to}}
      },
    })
    await redisClient.del('userId');
    return followUser
  };

  public static async unfollowUser(from:string, to:string ){
    const unfollowUser= prismaClient.follows.delete({
      where: {followerId_followingId: {followerId:from, followingId: to}},
     });
     await redisClient.del('userId');
     return unfollowUser
  }

 


}
export default UserService;