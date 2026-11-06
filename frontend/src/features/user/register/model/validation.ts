import { z } from "zod";

const PASSWORD_MIN_LENGTH = 8;
export const registerSchema = z.object({
  username: z.string().trim().min(1, "Введите имя пользователя"),
  email: z.string().trim().email("Введите корректный email"),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Пароль должен содержать не менее ${PASSWORD_MIN_LENGTH} символов`,
    ),
});

export type RegisterValues = z.infer<typeof registerSchema>;
