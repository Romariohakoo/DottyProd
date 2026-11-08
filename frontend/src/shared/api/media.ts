import api from "./client";

export const uploadMedia = async (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return (await api.post<{ url: string }>("/media", body)).data.url;
};
