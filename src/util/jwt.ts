import jwt from "jsonwebtoken";
import { z } from "zod";

/**
 * JWT Payload Schema
 */
export const payload = z.object({
  userId: z.string().nonempty("userId is required"),
  userName: z.string().nonempty("userName is required"),
  profilePicture: z.string().optional(),
});

export type Payload = z.infer<typeof payload>;

/**
 * JWT Utility Class
 */
class JWTService {
  constructor(private readonly SECRET: string) {}

  generateToken(data: Payload, timeInMin: number): string {
    const token = jwt.sign(data, this.SECRET, {
      expiresIn: timeInMin * 60, // seconds
    });

    return token;
  }

  verifyToken(token: string): Payload {
    const decoded = jwt.verify(token, this.SECRET);
    return payload.parse(decoded);
  }
  generateTempToken(data:{name:string,email:string,description?:string,profilePicture?:string},expiresInMin:number):string{
    const token = jwt.sign(
      data,
      this.SECRET,
      {
        expiresIn: expiresInMin*60
      }
    )
    return token;
  };
  verifyTempToken(token: string): { name: string; email: string; description: string; profilePicture: string } {
    const data = jwt.verify(token, this.SECRET) as { name: string; email: string; description: string; profilePicture: string };
    return {
      name: data.name,
      email: data.email,
      description: data.description,
      profilePicture: data.profilePicture,
    };
  }
}

export default JWTService;