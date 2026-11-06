import { z } from 'zod';

export const loginSchema = z.object({
  login: z
    .string()
    .min(4, 'Логин должен содержать не менее 4 символов')
    .max(20),
  password: z
    .string()
    .min(8, 'Пароль должен содержать не менее 8 символов'),
});

export type LoginValues = z.infer<typeof loginSchema>;
