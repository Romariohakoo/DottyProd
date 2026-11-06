import { useQuery } from "@tanstack/react-query";

import { getMe, userQueryKeys } from "../api";

export const useGetMe = () => {
  return useQuery({
    queryKey: userQueryKeys.me,
    queryFn: getMe,
  });
};
