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
    this.jwtService = new JWTService(process.env.JWT_SECRET || process.env.SECRET || "default_jwt_secret_key");
  }

  async register(data: Omit<Users, "id">): Promise<{ otpSent: Boolean, tempToken: string }> {
    if (!data.email) {
      throw new Error("Email is required");
    }
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }
    const otp: string = generateOTP();
    await this.mailService.sendOTP({
      to: data.email,
      subject: "register",
      otp: otp
    });
    const cacheData = { ...data, otp };
    await this.cache.setWithTTL(`otp:register:${data.email}`, JSON.stringify(cacheData), 5);
    const tempToken: string = this.jwtService.generateTempToken({ name: data.name, email: data.email, description: `${data.description}`, profilePicture: `${data.profilePicture}` }, 5);
    return { otpSent: true, tempToken };
  }

  async login(email: string): Promise<{ user: Users; tempToken: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("User with this email not found");
    }

    const otp: string = generateOTP();
    await this.mailService.sendOTP({
      to: email,
      subject: "register",
      otp: otp
    });
    const cacheData = { ...user, otp };
    await this.cache.setWithTTL(`otp:login:${email}`, JSON.stringify(cacheData), 5);
    const tempToken: string = this.jwtService.generateTempToken({ name: user.name, email: email, description: `${user.description}`, profilePicture: `${user.profilePicture}` }, 5);

    return { user, tempToken };
  }

  async findById(id: string): Promise<Users> {
    return await this.userRepository.findById(id);
  }

  async findAll(): Promise<Users[]> {
    return await this.userRepository.findAll();
  }
  async findByEmail(email:string):Promise<Users>{
    const data = await this.userRepository.findByEmail(email);
    if (!data) {
      throw new Error("id not found");
    };
    return data;
  }

  async verifyOTP(otp: string, tempToken: string): Promise<{ user: Users; authenticationTokens: { accessToken: string, refreshToken: string } }> {
    let decoded;
    try {
      decoded = this.jwtService.verifyTempToken(tempToken);
    } catch (err) {
      throw new Error("Invalid or expired registration token");
    }
    const cachedData = await this.cache.get(`otp:register:${decoded.email}`);
    if (!cachedData) {
      throw new Error("OTP expired or not found");
    }
    const data = JSON.parse(cachedData);
    if (data.otp !== otp) {
      throw new Error("Invalid OTP");
    }
    const user: Users = await this.userRepository.create({
      name: decoded.name,
      email: decoded.email,
      description: decoded.description || null,
      profilePicture: decoded.profilePicture || null,
    });
    const accessToken: string = this.jwtService.generateToken(
      {
        userId: user.id,
        userName: user.name,
        profilePicture: user.profilePicture || undefined,
      },
      120 // 120 minutes expiration
    );
    const refreshToken: string = this.jwtService.generateToken(
      {
        userId: user.id,
        userName: user.name,
        profilePicture: user.profilePicture || undefined,
      },
      300
    )
    await this.cache.delete(`otp:${decoded.email}`);
    return { user, authenticationTokens: { accessToken: accessToken, refreshToken: refreshToken } };
  }
  async verifyOTPLogin(otp: string, tempToken: string): Promise<{ user: Users; authenticationTokens: { accessToken: string, refreshToken: string } }> {
    let decoded;
    try {
      decoded = this.jwtService.verifyTempToken(tempToken);
    } catch (err) {
      throw new Error("Invalid or expired registration token");
    }
    const cachedData = await this.cache.get(`otp:login:${decoded.email}`);
    if (!cachedData) {
      throw new Error("OTP expired or not found");
    }
    const data = JSON.parse(cachedData);
    if (data.otp !== otp) {
      throw new Error("Invalid OTP");
    }
    const user: Users = await this.userRepository.create({
      name: decoded.name,
      email: decoded.email,
      description: decoded.description || null,
      profilePicture: decoded.profilePicture || null,
    });
    const accessToken: string = this.jwtService.generateToken(
      {
        userId: user.id,
        userName: user.name,
        profilePicture: user.profilePicture || undefined,
      },
      120 // 120 minutes expiration
    );
    const refreshToken: string = this.jwtService.generateToken(
      {
        userId: user.id,
        userName: user.name,
        profilePicture: user.profilePicture || undefined,
      },
      300
    )
    await this.cache.delete(`otp:${decoded.email}`);
    return { user, authenticationTokens: { accessToken: accessToken, refreshToken: refreshToken } };
  }

}