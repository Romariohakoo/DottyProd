'use client';

import { useRouter } from 'next/navigation';

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { userQueryKeys } from '@entities/user';

import { register } from '../api/register';
import type { RegisterDto } from '../api/register.dto';

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterDto) => register(data),
    onSuccess: () => {
      router.replace('/');
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.me,
      });
    },
  });
}
