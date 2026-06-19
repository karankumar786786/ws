import type { UserRepository } from "../repository/user";
import type { Users } from "../db/schema";
import JWTService from "../util/jwt";
import type { Cache } from "../cache/redis";
import { generateOTP } from "../util/otp";
import type { MailService } from "../util/mail";

export class UserService {
  private readonly jwtService: JWTService;


  constructor(
    private readonly userRepository: UserRepository,
    private readonly cache: Cache,
    private readonly mailService: MailService,
  ) {
    this.jwtService = new JWTService(process.env.JWT_SECRET || "default_jwt_secret_key");
  }

  async register(data: Omit<Users, "id">): Promise<{ otpSent: Boolean, tempToken: string }> {
    if (!data.email) {
      throw new Error("Email is required");
    }
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }
    const otp = generateOTP();
    await this.mailService.sendOTP({
      to: data.email,
      subject: "register",
      otp: otp
    });
    const cacheData = { ...data, otp };
    await this.cache.setWithTTL(`otp:${data.email}`, JSON.stringify(cacheData), 5);
    // const user = await this.userRepository.create(data);
    // const token = this.jwtService.generateToken(
    //   {
    //     userId: user.id,
    //     userName: user.name,
    //     profilePicture: user.profilePicture || undefined,
    //   },
    //   120 // 120 minutes expiration
    // );

    const tempToken: string = this.jwtService.generateTempToken({ name: data.name, email: data.email, description: `${data.description}`, profilePicture: `${data.profilePicture}` }, 5);
    return { otpSent: true, tempToken };
  }

  async login(email: string): Promise<{ user: Users; token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("User with this email not found");
    }

    const token = this.jwtService.generateToken(
      {
        userId: user.id,
        userName: user.name,
        profilePicture: user.profilePicture || undefined,
      },
      120 // 120 minutes expiration
    );

    return { user, token };
  }

  async findById(id: string): Promise<Users> {
    return await this.userRepository.findById(id);
  }

  async findAll(): Promise<Users[]> {
    return await this.userRepository.findAll();
  }

  async verifyOTP(otp: string, email:)
}