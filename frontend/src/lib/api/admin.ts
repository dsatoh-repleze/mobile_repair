import { apiClient } from './client';

// Dashboard types
export interface DashboardStats {
  total_members: number;
  new_members_this_month: number;
  member_growth_rate: number;
  redemptions_this_month: number;
  redemption_growth_rate: number;
  active_tickets: number;
  total_remaining_uses: number;
  stores_count: number;
  sales_today: number;
  sales_this_month: number;
  sales_growth_rate: number;
  orders_today: number;
  orders_this_month: number;
}

export interface RecentActivity {
  id: number;
  member_name: string;
  staff_name: string;
  store_name: string;
  ticket_type: string;
  redeemed_at: string;
  time_ago: string;
}

export interface MonthlyTrend {
  label: string;
  count: number;
}

export interface StoreStats {
  id: number;
  name: string;
  prefecture: string;
  staff_count: number;
  redemptions_this_month: number;
  total_redemptions: number;
}

export interface TicketDistribution {
  ticket_type: string;
  count: number;
  remaining: number;
}

export interface StaffRanking {
  rank: number;
  staff_id: number;
  staff_name: string;
  store_name: string;
  order_count: number;
  total_sales: number;
  average_order: number;
}

export interface StaffRankingSummary {
  total_sales: number;
  total_orders: number;
  staff_count: number;
}

export interface SalesTrend {
  date: string;
  label: string;
  order_count: number;
  total_sales: number;
}

// Plan types
export interface Plan {
  id: number;
  name: string;
  price: number;
  price_formatted: string;
  description: string | null;
  ticket_count: number;
  is_active: boolean;
  subscriptions_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlanInput {
  name: string;
  price: number;
  description?: string;
  ticket_count: number;
  is_active?: boolean;
}

// Store types
export interface Store {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  prefecture: string;
  staff_count?: number;
  staffs?: { id: number; name: string; email: string }[];
  redemptions_this_month?: number;
  total_redemptions?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoreInput {
  name: string;
  address?: string;
  phone?: string;
  prefecture: string;
}

// Stocktaking types
export interface StocktakingSession {
  id: number;
  store_id: number;
  store_name: string;
  created_by_name: string;
  completed_by_name?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  status_label: string;
  notes?: string;
  items_count: number;
  progress: {
    total: number;
    counted: number;
    percentage: number;
  };
  discrepancy_summary?: {
    total_difference: number;
    positive_count: number;
    negative_count: number;
    match_count: number;
  };
  started_at: string;
  completed_at?: string;
}

export interface StocktakingItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku?: string;
  product_barcode?: string;
  system_quantity: number;
  actual_quantity?: number;
  difference?: number;
  notes?: string;
  is_counted: boolean;
}

export interface StocktakingInput {
  store_id: number;
  notes?: string;
}

export const adminApi = {
  // Dashboard
  getDashboardStats: () =>
    apiClient.get<{ stats: DashboardStats }>('/admin/dashboard'),

  getRecentActivity: () =>
    apiClient.get<{ activities: RecentActivity[] }>('/admin/dashboard/activity'),

  getMonthlyTrend: () =>
    apiClient.get<{ trend: MonthlyTrend[] }>('/admin/dashboard/trend'),

  getStoreStats: () =>
    apiClient.get<{ stores: StoreStats[] }>('/admin/dashboard/stores'),

  getTicketDistribution: () =>
    apiClient.get<{ distribution: TicketDistribution[] }>('/admin/dashboard/tickets'),

  getStaffRanking: (period?: string, storeId?: number) =>
    apiClient.get<{ rankings: StaffRanking[]; summary: StaffRankingSummary }>('/admin/dashboard/staff-ranking', {
      params: { period, store_id: storeId },
    }),

  getSalesTrend: (storeId?: number) =>
    apiClient.get<{ trend: SalesTrend[] }>('/admin/dashboard/sales-trend', {
      params: storeId ? { store_id: storeId } : {},
    }),

  // Plans
  getPlans: (activeOnly?: boolean) =>
    apiClient.get<{ plans: Plan[] }>('/admin/plans', {
      params: activeOnly ? { active_only: true } : {},
    }),

  getPlan: (id: number) =>
    apiClient.get<{ plan: Plan }>(`/admin/plans/${id}`),

  createPlan: (data: PlanInput) =>
    apiClient.post<{ message: string; plan: Plan }>('/admin/plans', data),

  updatePlan: (id: number, data: PlanInput) =>
    apiClient.put<{ message: string; plan: Plan }>(`/admin/plans/${id}`, data),

  deletePlan: (id: number) =>
    apiClient.delete<{ message: string }>(`/admin/plans/${id}`),

  togglePlanStatus: (id: number) =>
    apiClient.post<{ message: string; is_active: boolean }>(`/admin/plans/${id}/toggle-status`),

  // Stores
  getStores: (prefecture?: string) =>
    apiClient.get<{ stores: Store[]; prefectures: string[] }>('/admin/stores', {
      params: prefecture ? { prefecture } : {},
    }),

  getStore: (id: number) =>
    apiClient.get<{ store: Store }>(`/admin/stores/${id}`),

  createStore: (data: StoreInput) =>
    apiClient.post<{ message: string; store: Store }>('/admin/stores', data),

  updateStore: (id: number, data: StoreInput) =>
    apiClient.put<{ message: string; store: Store }>(`/admin/stores/${id}`, data),

  deleteStore: (id: number) =>
    apiClient.delete<{ message: string }>(`/admin/stores/${id}`),

  getStoreMonthlyStats: (id: number) =>
    apiClient.get<{ store_id: number; store_name: string; monthly_redemptions: MonthlyTrend[] }>(
      `/admin/stores/${id}/stats`
    ),

  // Stocktaking (棚卸し)
  getStocktakingSessions: (params?: { store_id?: number; status?: string }) =>
    apiClient.get<{ sessions: { data: StocktakingSession[] }; stores: Store[] }>('/admin/stocktaking', { params }),

  createStocktaking: (data: StocktakingInput) =>
    apiClient.post<{ message: string; session: { id: number; store_name: string; items_count: number } }>('/admin/stocktaking', data),

  getStocktakingSession: (id: number) =>
    apiClient.get<{ session: StocktakingSession; items: StocktakingItem[] }>(`/admin/stocktaking/${id}`),

  updateStocktakingItem: (sessionId: number, itemId: number, data: { actual_quantity: number; notes?: string }) =>
    apiClient.put<{ message: string; item: StocktakingItem; progress: StocktakingSession['progress'] }>(
      `/admin/stocktaking/${sessionId}/items/${itemId}`,
      data
    ),

  scanStocktakingBarcode: (sessionId: number, barcode: string) =>
    apiClient.post<{ item: StocktakingItem }>(`/admin/stocktaking/${sessionId}/scan`, { barcode }),

  completeStocktaking: (id: number, applyAdjustments: boolean) =>
    apiClient.post<{ message: string }>(`/admin/stocktaking/${id}/complete`, { apply_adjustments: applyAdjustments }),

  cancelStocktaking: (id: number) =>
    apiClient.post<{ message: string }>(`/admin/stocktaking/${id}/cancel`),
};
