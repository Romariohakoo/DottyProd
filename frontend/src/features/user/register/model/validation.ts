import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

const NAME_PATTERN = /^[а-яА-ЯёЁa-zA-Z0-9 _-]{2,20}$/;

export const registerSchema = z.object({
  login: z
    .string()
    .min(4, 'Логин должен содержать не менее 4 символов'),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Пароль должен содержать от ${PASSWORD_MIN_LENGTH} до ${PASSWORD_MAX_LENGTH} символов`,
    )
    .max(
      PASSWORD_MAX_LENGTH,
      `Пароль должен содержать от ${PASSWORD_MIN_LENGTH} до ${PASSWORD_MAX_LENGTH} символов`,
    )
    .regex(
      /[A-Za-z]/,
      'Пароль должен содержать хотя бы одну латинскую букву',
    )
    .regex(
      /\d/,
      'Пароль должен содержать хотя бы одну цифру',
    ),
  name: z
    .string()
    .trim()
    .min(2, 'Укажите имя')
    .regex(
      NAME_PATTERN,
      'Имя должно содержать от 2 до 20 символов: буквы, цифры, пробелы, «_» или «-».',
    ),
});

export type RegisterValues = z.infer<typeof registerSchema>;
