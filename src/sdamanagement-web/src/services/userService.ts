import api from "@/lib/api";
import type { components } from "@/api-generated/schema";
import type { CreateUserFormData, UpdateUserFormData } from "@/schemas/userSchema";

/**
 * Type aliases over OpenAPI-generated schemas. The codegen's nullability is
 * looser than the hand-rolled definitions used to be — every property is `?`
 * because the emitter can't tell required from optional. Treat call-site
 * narrowing as the cost of having a single source of truth.
 */
type Schemas = components["schemas"];

export type UserDepartmentBadge = NonNullable<Schemas["UserDepartmentBadge"]>;
export type UserListItem = NonNullable<Schemas["UserListItem"]>;
export type UserResponse = NonNullable<Schemas["UserResponse"]>;
export type GuestCreatedResponse = NonNullable<Schemas["GuestCreatedResponse"]>;
export type BulkCreateUsersResponse = NonNullable<Schemas["BulkCreateUsersResponse"]>;
/**
 * FE-only augmentation: `isGuest` is set client-side after creating a guest
 * via the inline form; the backend's AssignableOfficerResponse doesn't carry
 * it. Keeps the role-roster code able to differentiate styling.
 */
export type AssignableOfficer = NonNullable<Schemas["AssignableOfficerResponse"]> & {
  isGuest?: boolean;
};

/**
 * Generic paged response wrapper. Backend emits a closed instantiation
 * `PagedUserListItem`; this helper keeps the call sites idiomatic.
 */
export interface PagedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export const userService = {
  getAssignableOfficers: () =>
    api.get<{ items: AssignableOfficer[]; nextCursor: string | null }>("/api/users/assignable-officers"),
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
  createGuest: (data: { name: string; phone?: string }) =>
    api.post<GuestCreatedResponse>("/api/users/guests", data),
  deleteUser: (id: number) => api.delete(`/api/users/${id}`),
  uploadAvatar: (userId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/api/avatars/${userId}`, formData);
  },
};
