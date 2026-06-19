import { Router } from "express";
import { UserController } from "../controllers/user";
import { UserService } from "../services/user";
import { UserRepository } from "../repository/user";

const router = Router();
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);


router.post("/register", (req, res) => userController.register(req, res));
router.post("/login", (req, res) => userController.login(req, res));
router.get("/:id", (req, res) => userController.getById(req, res));
router.get("/", (req, res) => userController.getAll(req, res));

export default router;
