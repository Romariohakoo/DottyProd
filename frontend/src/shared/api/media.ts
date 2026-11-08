import api from "./client";

export const uploadMedia = async (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return (
    await api.post<{ url: string }>("/media", body, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data.url;
};
