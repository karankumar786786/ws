import type { Request, Response } from "express";
import { z } from "zod";
import type { UserService } from "../services/user";

const registerUserSchema = z.object({
  name: z.string({ error: "name must be a string" }).min(1, "name should not be empty"),
  email: z.string({ error: "email must be a string" }).email("email should be proper format of mail"),
  description: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
});

const loginUserSchema = z.object({
  email: z.string({ error: "email must be a string" }).email("email should be proper format of mail"),
});

const verifyOTPSchema = z.object({
  email: z.string({ error: "email must be a string" }).email("email should be proper format of mail"),
  otp: z.string({ error: "otp must be a string" }).min(1, "otp should not be empty"),
  tempToken: z.string({ error: "tempToken must be a string" }).min(1, "tempToken should not be empty"),
});

export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  async register(req: Request, res: Response) {
    try {
      const data = registerUserSchema.parse(req.body);
      const result = await this.userService.register({
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
      const user = await this.userService.findById(id);
      res.status(200).json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message || "User not found" });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const users = await this.userService.findAll();
      res.status(200).json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async verifyOTP(req: Request, res: Response) {
    try {
      const data = verifyOTPSchema.parse(req.body);
      const result = await this.userService.verifyOTP(data.otp, data.email, data.tempToken);
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
