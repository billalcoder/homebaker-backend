import { z } from "zod/v3"

const stripTags = (str) => str.replace(/<[^>]*>?/gm, "");
export const leadValidation = z.object({
    shop : z.string("shop name should be string").trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid client ID"),
    userName : z.string("username should be string").transform((val)=> (val ? stripTags(val) : "")),
    userPhoneNo : z.number("user Phone No should be Integer").transform((val)=> (val ? stripTags(val) : "")),
})