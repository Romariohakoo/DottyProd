import { z } from "zod";

const NAME_PATTERN = /^[а-яА-ЯёЁa-zA-Z0-9 _-]{2,20}$/;

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Укажите имя")
    .regex(
      NAME_PATTERN,
      "Имя должно содержать от 2 до 20 символов: буквы, цифры, пробелы, «_» или «-».",
    ),
});

export type UpdateUserValues = z.infer<typeof updateUserSchema>;
