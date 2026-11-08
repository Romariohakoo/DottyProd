import { z } from "zod";

export const updatePlaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Введите название места")
    .max(200, "Название должно содержать не более 200 символов"),
  address: z
    .string()
    .trim()
    .max(1000, "Адрес должен содержать не более 1000 символов"),
  description: z.string(),
  latitude: z
    .number({ error: "Введите широту числом" })
    .finite("Введите конечное число")
    .min(-90, "Широта должна быть от −90 до 90")
    .max(90, "Широта должна быть от −90 до 90"),
  longitude: z
    .number({ error: "Введите долготу числом" })
    .finite("Введите конечное число")
    .min(-180, "Долгота должна быть от −180 до 180")
    .max(180, "Долгота должна быть от −180 до 180"),
});

export type UpdatePlaceValues = z.infer<typeof updatePlaceSchema>;
