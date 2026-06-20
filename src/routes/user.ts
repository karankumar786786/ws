import { Router } from "express";
import { UserController } from "../controllers/user";
import { UserService } from "../services/user";
import { UserRepository } from "../repository/user";
import JWTService from "../util/jwt";
import {cache} from "../cache/redis"
import { MailService } from "../util/mail";

const router = Router();
const userRepository = new UserRepository();
const mailService = new MailService();
const userService = new UserService(userRepository,cache,mailService);
const userController = new UserController(userService);


router.post("/register", (req, res) => userController.register(req, res));
router.post("/verify", (req, res) => userController.verifyOTP(req, res));
router.post("/login", (req, res) => userController.login(req, res));
router.post("/verify-login", (req, res) => userController.verifyOTPLogin(req, res));
router.get("/:id", (req, res) => userController.getById(req, res));
router.get("/:email", (req, res) => userController.getByEmail(req, res));

export default router;
