import { z } from "zod";

export const updateTripSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Введите название поездки")
      .max(200, "Название должно содержать не более 200 символов"),
    country: z
      .string()
      .trim()
      .min(1, "Введите страну")
      .max(200, "Страна должна содержать не более 200 символов"),
    startDate: z.iso.date("Укажите корректную дату начала"),
    endDate: z.iso.date("Укажите корректную дату окончания"),
    description: z.string(),
    coverUrl: z
      .string()
      .trim()
      .max(2048, "Путь к обложке должен содержать не более 2048 символов"),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: "Дата окончания не может быть раньше даты начала",
    path: ["endDate"],
  });

export type UpdateTripValues = z.infer<typeof updateTripSchema>;
