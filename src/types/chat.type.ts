import { z } from "zod";
export const Chat = z.object(
    {
        messageId: z.string({error:"chat id required"}).nonempty({error:"chatId cannot be empty"}),
        from: z.string({error:"from is required"}).nonempty({error:"from cannot be empty"}),
        to: z.string({error:"to is required"}).nonempty({error:"to cannot be empty"}),
        message: z.string({error:"message is required"}).nonempty({error:"message cannot be empty"}),
        timestamp: z.string({error:"timestamp is required"}).nonempty({error:"timestamp cannot be empty"}),
    }
)

export type Chat = z.infer<typeof Chat>;