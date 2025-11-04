import "dotenv/config"
import {z} from 'zod';
const EnvSchema=z.object({
    PORT:z.coerce.number().int().min(1).default(3000),
    DB_CONNECT:z.url(),
    JWT_SECRET:z.string().min(1),
    FRONTEND_URL:z.url(),

})
export const env=EnvSchema.parse(process.env)