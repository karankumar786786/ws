import { randomUUIDv7 } from "bun";
import type {Users} from "../db/schema";
import { UserInputType, users} from "../db/schema";
import { db } from "../index";
import type{BaseRepository} from "./repository.type";
import { eq } from "drizzle-orm";


export class UserRepository implements BaseRepository<Users>{
    async create(data: Omit<Users, "id">): Promise<Users> {
        const id = randomUUIDv7("hex");
        const validated = UserInputType.parse({ ...data, id });
        const [insertedUser] = await db.insert(users).values(validated).returning();
        if (!insertedUser) {
            throw new Error("Failed to create user");
        }
        return insertedUser;
    }
    async update(id: string, data: Omit<Users, "id">): Promise<Boolean> {
        const [findUser] = await db.select().from(users).where(eq(users.id,id));
        if (!findUser) {
            throw new Error("user not found");
        };
        await db.update(users).set(data).where(eq(users.id,id));
        return true;
    }
    async delete(id: string): Promise<Boolean> {
        const [findUser] = await db.select().from(users).where(eq(users.id,id));
        if (!findUser) {
            throw new Error("user not found");
        };
        await db.delete(users).where(eq(users.id,id));
        return true;
    }
    async findById(id: string): Promise<Users> {
        const [findUser] = await db.select().from(users).where(eq(users.id,id));
        if (!findUser) {
            throw new Error("user not found");
        };
        return findUser;
    }
    async findAll(): Promise<Users[]> {
        return await db.select().from(users).limit(50);
    }
    async findByEmail(email: string): Promise<Users | null> {
        const [findUser] = await db.select().from(users).where(eq(users.email, email));
        return findUser || null;
    }

}