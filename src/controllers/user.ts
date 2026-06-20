import type { Request, Response } from "express";
import { z } from "zod";
import type { UserService } from "../services/user";
import type { Users } from "../db/schema";

const registerUserSchema = z.object({
  name: z.string({ error: "name must be a string" }).min(1, "name should not be empty"),
  email: z.string({ error: "email must be a string" }).email("email should be proper format of mail"),
  description: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
});
type RegisterSchema = z.infer<typeof registerUserSchema>;
const loginUserSchema = z.object({
  email: z.email({ error: "email is required" }),
});

const verifyOTPSchema = z.object({
  otp: z.string({ error: "otp must be a string" }).min(1, "otp should not be empty"),
  tempToken: z.string({ error: "tempToken must be a string" }).min(1, "tempToken should not be empty"),
});
type VerifyOtpSchema = z.infer<typeof verifyOTPSchema>;

export class UserController {
  constructor(
    private readonly userService: UserService,
  ) { }

  async register(req: Request, res: Response) {
    try {
      const data: RegisterSchema = registerUserSchema.parse(req.body);
      const result: { otpSent: Boolean, tempToken: string } = await this.userService.register({
        name: data.name,
        email: data.email,
        description: data.description ?? null,
        profilePicture: data.profilePicture ?? null,
      });
      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(400).json({ error: error.message || "Bad Request" });
      }
    }
  }

  async login(req: Request, res: Response) {
    try {
      const data = loginUserSchema.parse(req.body);
      const result = await this.userService.login(data.email);
      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(400).json({ error: error.message || "Bad Request" });
      }
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params["id"];
      if (!id || typeof id !== "string") {
        res.status(400).json({ error: "ID is required and must be a string" });
        return;
      }
      const user:Users = await this.userService.findById(id);
      res.status(200).json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message || "User not found" });
    }
  }

  async verifyOTP(req: Request, res: Response) {
    try {
      const data: VerifyOtpSchema = verifyOTPSchema.parse(req.body);
      const result: {
        user: Users, authenticationTokens: {
          accessToken: string;
          refreshToken: string;
        }
      } = await this.userService.verifyOTP(data.otp, data.tempToken);
      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(400).json({ error: error.message || "Bad Request" });
      }
    }
  }
  async verifyOTPLogin(req: Request, res: Response) {
    try {
      const data:VerifyOtpSchema = verifyOTPSchema.parse(req.body);
      const result:{
        user: Users, authenticationTokens: {
          accessToken: string;
          refreshToken: string;
        }
      } = await this.userService.verifyOTP(data.otp, data.tempToken);
      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(400).json({ error: error.message || "Bad Request" });
      }
    }
  }
  async getByEmail(req: Request, res: Response) {
    try {
      const email = req.params["email"];
      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "ID is required and must be a string" });
        return;
      }
      const result:Users = await this.userService.findByEmail(email);
      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(400).json({ error: error.message || "Bad Request" });
      }
    }
  }
}
