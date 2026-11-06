'use client';

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { userQueryKeys } from '@entities/user';

import { updateUser } from '../api/update-user';

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.me,
      });
    },
  });
}
