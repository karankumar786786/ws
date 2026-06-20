import {  pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";


export const users = pgTable(
    "users",
    {
        id: varchar("id",{length:255}).primaryKey(),
        name: varchar("name",{length:255}).notNull(),
        description: varchar("description",{length:255}),
        email: varchar("email",{length:255}).unique(),
        profilePicture: varchar("profile_picture",{length:255})
    }
);


export const userFriend = pgTable(
    "user_friends",
    {
        id: varchar("id",{length:255}).primaryKey(),
        userId: varchar("user_id",{length:255}).notNull().references(()=> users.id),
        friendId: varchar("friend_id",{length:255}).notNull().references(()=>users.id)
    }
);

export const groups = pgTable(
    "groups",
    {
        id: varchar("id",{length:255}).primaryKey(),
        name: varchar("name",{length:255}).notNull(),
        description: varchar("description",{length:255}),
    }
);

export const groupMembers = pgTable(
    "group_members",
    {
        id: varchar("id",{length:255}).primaryKey(),
        groupId: varchar("group_id",{length:255}).notNull().references(()=>groups.id),
        userId: varchar("user_id",{length:255}).notNull().references(()=>users.id)
    }
);



export const UserInputType = createInsertSchema(users);
export const UserFriendInputType = createInsertSchema(userFriend);
export const GroupInputType = createInsertSchema(groups);
export const GroupMemberInputType = createInsertSchema(groupMembers);
export type Users = typeof users.$inferSelect;
export type UserFriend = typeof userFriend.$inferSelect;
export type Groups = typeof groups.$inferSelect;
export type GroupMembers = typeof groupMembers.$inferSelect;