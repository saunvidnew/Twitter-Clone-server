import { prismaClient } from "../clients/db";
import { redisClient } from "../clients/redis";

export interface CreateTweetPayload {
    content: string;
    imageURL?: string;
    userId: string;
  }

class TweetService{

    public static async createTweet(data:CreateTweetPayload){
        const rateLimitFlag= await redisClient.get(`Rate_limit:Tweet:${data.userId}`)
        if(rateLimitFlag) throw new Error('wait for some time...')

        if (data.content!== '') {
            const tweet=prismaClient.tweet.create({
                data: {
                  content: data.content,
                  imageURL: data.imageURL,
                  author: { connect: { id: data.userId } },
                }
                ,
                
        });
        await redisClient.setex(`Rate_limit:Tweet:${data.userId}`,5,1 );
        await redisClient.del('all_tweets');
        return tweet
        }
        
    
    
    
}
    public static async getAllTweets(){
        const cachedTweets= await redisClient.get('all_tweets');
        if(cachedTweets) return JSON.parse(cachedTweets);

        const tweets= await prismaClient.tweet.findMany({ orderBy: { createdAt: "desc" } });
        await redisClient.set('all_tweets', JSON.stringify(tweets));
        return tweets;
    }

}
export default TweetService;