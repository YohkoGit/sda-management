import api from "@/lib/api";
import type { CreateUserFormData, UpdateUserFormData } from "@/schemas/userSchema";

export interface UserDepartmentBadge {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
}

export interface UserListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  departments: UserDepartmentBadge[];
  createdAt: string;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isGuest: boolean;
  departments: UserDepartmentBadge[];
  createdAt: string;
  updatedAt: string;
}

export interface PagedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export interface BulkCreateUsersResponse {
  created: UserResponse[];
  count: number;
}

export const userService = {
  getUsers: (cursor?: string, limit?: number) =>
    api.get<PagedResponse<UserListItem>>("/api/users", {
      params: { cursor, limit },
    }),
  getUserById: (id: number) => api.get<UserResponse>(`/api/users/${id}`),
  createUser: (data: CreateUserFormData) =>
    api.post<UserResponse>("/api/users", data),
  bulkCreateUsers: (data: { users: CreateUserFormData[] }) =>
    api.post<BulkCreateUsersResponse>("/api/users/bulk", data),
  updateUser: (id: number, data: UpdateUserFormData) =>
    api.put<UserResponse>(`/api/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/api/users/${id}`),
  uploadAvatar: (userId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/api/avatars/${userId}`, formData);
  },
};
