
/* Reuses the shared Axios client so admin requests automatically include
 * the JWT and use the app's existing handling for expired tokens.
 */

import api from './api'

// Fetch dashboard statistics for the admin overview.
export async function getAdminStats() {
  const response = await api.get('/admin/stats')
  return response.data
}

// Fetch users, with optional pagination, role, status, and search filters.
export async function getAdminUsers(params = {}) {
  const response = await api.get('/admin/users', { params })
  return response.data
}

// Update permitted fields for a user, such as role or active status.
export async function updateAdminUser(userId, data) {
  const response = await api.patch(`/admin/users/${userId}`, data)
  return response.data
}

// Delete a user by ID.
export async function deleteAdminUser(userId) {
  const response = await api.delete(`/admin/users/${userId}`)
  return response.data
}

// Fetch categories across users, with optional filters and pagination.
export async function getAdminCategories(params = {}) {
  const response = await api.get('/admin/categories', { params })
  return response.data
}

// Fetch one category by ID.
export async function getAdminCategory(categoryId) {
  const response = await api.get(`/admin/categories/${categoryId}`)
  return response.data
}

// Create a category through the admin API.
export async function createAdminCategory(data) {
  const response = await api.post('/admin/categories', data)
  return response.data
}

// Partially update a category.
export async function updateAdminCategory(categoryId, data) {
  const response = await api.patch(`/admin/categories/${categoryId}`, data)
  return response.data
}

// Delete a category by ID.
export async function deleteAdminCategory(categoryId) {
  const response = await api.delete(`/admin/categories/${categoryId}`)
  return response.data
}

// Fetch questions across users, with optional filters and pagination.
export async function getAdminQuestions(params = {}) {
  const response = await api.get('/admin/questions', { params })
  return response.data
}

// Fetch one question by ID.
export async function getAdminQuestion(questionId) {
  const response = await api.get(`/admin/questions/${questionId}`)
  return response.data
}

// Create a question through the admin API.
export async function createAdminQuestion(data) {
  const response = await api.post('/admin/questions', data)
  return response.data
}

// Partially update a question.
export async function updateAdminQuestion(questionId, data) {
  const response = await api.patch(`/admin/questions/${questionId}`, data)
  return response.data
}

// Delete a question by ID.
export async function deleteAdminQuestion(questionId) {
  const response = await api.delete(`/admin/questions/${questionId}`)
  return response.data
}
