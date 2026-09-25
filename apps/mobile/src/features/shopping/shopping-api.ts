import type {
  AddShoppingItemBody,
  ShoppingItemDto,
  ShoppingListDto,
  UpdateShoppingItemBody,
} from '@yumi/shared';
import { apiClient } from '@/lib/api-client';

const listPath = (familyId: string) => `/families/${encodeURIComponent(familyId)}/shopping-list`;

export const shoppingApi = {
  /** `date` : n'importe quel jour de la semaine voulue ; absent = semaine en cours. */
  getList: (familyId: string, date?: string) =>
    apiClient.request<ShoppingListDto>(
      'GET',
      date ? `${listPath(familyId)}?date=${encodeURIComponent(date)}` : listPath(familyId),
    ),

  addItem: (familyId: string, body: AddShoppingItemBody) =>
    apiClient.request<ShoppingItemDto>('POST', `${listPath(familyId)}/items`, { body }),

  updateItem: (familyId: string, itemId: string, body: UpdateShoppingItemBody) =>
    apiClient.request<ShoppingItemDto>(
      'PATCH',
      `${listPath(familyId)}/items/${encodeURIComponent(itemId)}`,
      { body },
    ),

  deleteItem: (familyId: string, itemId: string) =>
    apiClient.request<void>('DELETE', `${listPath(familyId)}/items/${encodeURIComponent(itemId)}`),
};
