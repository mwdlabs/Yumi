import type { MeResponse, VerifyOtpResponse } from '@yumi/shared';
import { apiClient } from '@/lib/api-client';

export const authApi = {
  requestOtp: (email: string) =>
    apiClient.request<void>('POST', '/auth/otp/request', { body: { email }, auth: false }),

  verifyOtp: (email: string, code: string, deviceLabel?: string) =>
    apiClient.request<VerifyOtpResponse>('POST', '/auth/otp/verify', {
      body: { email, code, deviceLabel },
      auth: false,
    }),

  logout: (refreshToken: string) =>
    apiClient.request<void>('POST', '/auth/logout', { body: { refreshToken }, auth: false }),

  me: () => apiClient.request<MeResponse>('GET', '/me'),
};
