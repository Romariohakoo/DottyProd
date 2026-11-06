import { useQuery } from '@tanstack/react-query';

import { getMe, getUser, userQueryKeys } from '../api';

export const useGetMe = () => {
  return useQuery({
    queryKey: userQueryKeys.me,
    queryFn: getMe,
  });
};

export const useGetUser = (id: string) => {
  return useQuery({
    queryKey: [...userQueryKeys.base, id],
    queryFn: () => getUser({ id }),
  });
};
