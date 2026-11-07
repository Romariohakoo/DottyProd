import { z } from "zod";

const dateTime = z.string().datetime({
  local: true,
  message: "Укажите корректные дату и время",
});

const placeChoiceSchema = z
  .object({
    mode: z.enum(["none", "existing", "new"]),
    id: z.string(),
    name: z.string(),
    address: z.string(),
    latitude: z.string(),
    longitude: z.string(),
  })
  .superRefine((values, context) => {
    if (values.mode === "existing") {
      const id = Number(values.id);
      if (!Number.isInteger(id) || id <= 0) {
        context.addIssue({
          code: "custom",
          path: ["id"],
          message: "Выберите место",
        });
      }
    }
    if (values.mode !== "new") return;

    if (!values.name.trim() || values.name.trim().length > 200) {
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: "Название должно содержать от 1 до 200 символов",
      });
    }
    if (values.address.trim().length > 1000) {
      context.addIssue({
        code: "custom",
        path: ["address"],
        message: "Адрес должен содержать не более 1000 символов",
      });
    }
    const latitude = Number(values.latitude);
    if (
      !values.latitude.trim() ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      context.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Введите широту от −90 до 90",
      });
    }
    const longitude = Number(values.longitude);
    if (
      !values.longitude.trim() ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      context.addIssue({
        code: "custom",
        path: ["longitude"],
        message: "Введите долготу от −180 до 180",
      });
    }
  });

export const updateEventSchema = z
  .object({
    type: z.enum(["activity", "movement"]),
    title: z
      .string()
      .trim()
      .min(1, "Введите название")
      .max(200, "Не более 200 символов"),
    description: z.string(),
    startAt: dateTime,
    endAt: z.union([z.literal(""), dateTime]),
    bookingUrl: z.string().trim().max(2048, "Не более 2048 символов"),
    category: z.enum([
      "excursion",
      "museum",
      "theater",
      "walk",
      "accommodation",
      "restaurant",
      "meeting",
      "other",
    ]),
    transportType: z.enum(["walk", "car", "train", "plane", "other"]),
    place: placeChoiceSchema,
    fromPlace: placeChoiceSchema,
    toPlace: placeChoiceSchema,
  })
  .superRefine((values, context) => {
    if (values.endAt && Date.parse(values.endAt) < Date.parse(values.startAt)) {
      context.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "Окончание не может быть раньше начала",
      });
    }
    if (values.type === "movement") {
      if (values.fromPlace.mode === "none") {
        context.addIssue({
          code: "custom",
          path: ["fromPlace", "mode"],
          message: "Укажите место отправления",
        });
      }
      if (values.toPlace.mode === "none") {
        context.addIssue({
          code: "custom",
          path: ["toPlace", "mode"],
          message: "Укажите место прибытия",
        });
      }
    }
  });

export type UpdateEventValues = z.infer<typeof updateEventSchema>;
