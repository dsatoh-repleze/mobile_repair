import { apiClient } from './client';

export interface Ticket {
  id: number;
  ticket_type: string;
  remaining_uses: number;
  status: 'active' | 'used' | 'expired';
  expires_at: string;
  is_expiring_soon: boolean;
  is_redeemable: boolean;
  is_in_cooldown: boolean;
  cooldown_remaining_seconds: number;
}

export interface TicketListResponse {
  tickets: Ticket[];
  summary: {
    total_remaining: number;
    active_count: number;
  };
}

export interface RedemptionHistory {
  id: number;
  ticket_type: string;
  store_name: string;
  staff_name: string | null;
  redeemed_at: string;
}

export interface RedemptionHistoryResponse {
  history: RedemptionHistory[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PrepareRedeemResponse {
  ticket: {
    id: number;
    ticket_type: string;
    remaining_uses: number;
  };
  member: {
    id: number;
    name: string;
  };
  confirmation_message: string;
}

export interface RedeemResponse {
  message: string;
  ticket: {
    id: number;
    remaining_uses: number;
    status: string;
  };
  redemption: {
    id: number;
    redeemed_at: string;
  };
}

// Purchase history types
export interface MemberOrder {
  id: number;
  receipt_uuid: string;
  store_name: string;
  total_amount: number;
  item_count: number;
  payment_method: string;
  created_at: string;
  items_preview: string;
}

export interface MemberOrderDetail {
  id: number;
  receipt_uuid: string;
  receipt_url: string;
  store: {
    name: string;
    address: string;
  };
  items: {
    id: number;
    product_name: string;
    product_category: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  total_amount: number;
  payment_method: string;
  staff_name: string;
  staff_code: string | null;
  coupon_code: string | null;
  created_at: string;
}

export interface MemberOrdersResponse {
  orders: MemberOrder[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const ticketsApi = {
  // Member APIs
  getTickets: () =>
    apiClient.get<TicketListResponse>('/member/tickets'),

  getTicket: (id: number) =>
    apiClient.get<{ ticket: Ticket }>(`/member/tickets/${id}`),

  prepareRedeem: (id: number) =>
    apiClient.get<PrepareRedeemResponse>(`/member/tickets/${id}/prepare-redeem`),

  redeem: (id: number, storeId?: number, staffId?: number) =>
    apiClient.post<RedeemResponse>(`/member/tickets/${id}/redeem`, {
      store_id: storeId,
      staff_id: staffId,
    }),

  getHistory: (page: number = 1) =>
    apiClient.get<RedemptionHistoryResponse>('/member/redemption-history', {
      params: { page },
    }),

  // Member Orders (購入履歴)
  getOrders: (page: number = 1) =>
    apiClient.get<MemberOrdersResponse>('/member/orders', {
      params: { page },
    }),

  getOrder: (id: number) =>
    apiClient.get<{ order: MemberOrderDetail }>(`/member/orders/${id}`),

  // EC注文作成
  createEcOrder: (data: {
    store_id: number;
    items: { product_id: number; quantity: number }[];
    payment_method: 'credit' | 'qr';
    staff_code?: string;
    coupon_code?: string;
  }) =>
    apiClient.post<{
      message: string;
      order: {
        id: number;
        receipt_uuid: string;
        receipt_url: string;
        total_amount: number;
        subtotal: number;
        tax: number;
        payment_method: string;
        store_name: string;
        items: {
          product_name: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        }[];
        created_at: string;
      };
    }>('/member/ec-orders', data),

  // Staff APIs
  searchMembers: (query: string) =>
    apiClient.get<{ members: { id: number; name: string; email: string }[] }>(
      '/staff/members/search',
      { params: { query } }
    ),

  getMemberTickets: (memberId: number) =>
    apiClient.get<{ member: { id: number; name: string }; tickets: Ticket[] }>(
      `/staff/members/${memberId}/tickets`
    ),

  staffRedeem: (ticketId: number, memberId: number, quantity: number = 1) =>
    apiClient.post<RedeemResponse>(`/staff/tickets/${ticketId}/redeem`, {
      member_id: memberId,
      quantity,
    }),

  getTodayHistory: () =>
    apiClient.get<{
      history: {
        id: number;
        member_name: string;
        ticket_type: string;
        staff_name: string;
        redeemed_at: string;
        minutes_ago: number;
      }[];
      total_today: number;
    }>('/staff/redemptions/today'),

  // Subscription APIs
  getSubscriptionPlans: () =>
    apiClient.get<{
      plans: {
        id: number;
        name: string;
        price: number;
        price_formatted: string;
        description: string | null;
        ticket_count: number;
      }[];
    }>('/member/subscription/plans'),

  getCurrentSubscription: () =>
    apiClient.get<{
      subscription: {
        id: number;
        plan: {
          id: number;
          name: string;
          price: number;
          price_formatted: string;
          ticket_count: number;
        };
        status: string;
        starts_at: string;
        ends_at: string | null;
      } | null;
    }>('/member/subscription/current'),

  subscribe: (planId: number) =>
    apiClient.post<{
      message: string;
      subscription: {
        id: number;
        plan: {
          id: number;
          name: string;
          price_formatted: string;
          ticket_count: number;
        };
        starts_at: string;
        ends_at: string;
      };
    }>('/member/subscription/subscribe', { plan_id: planId }),

  cancelSubscription: () =>
    apiClient.post<{ message: string }>('/member/subscription/cancel'),
};
