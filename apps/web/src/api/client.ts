/**
 * GarmentOS Cloud — Shared API Client
 *
 * Production-grade HTTP client with Sanctum Bearer Token management,
 * tenant scoping, error normalization, and reactive authentication lifecycle.
 *
 * Security Notice:
 * Token is maintained in-memory for active sessions and persisted to browser storage
 * for session continuity across page refreshes. On any HTTP 401 response or explicit
 * logout, tokens are revoked from the server and purged immediately from client storage.
 */

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'platform_admin' | 'company_owner' | 'production_manager' | 'accountant' | 'worker' | 'sales_rep';
  tenant_id: string;
}

export interface ApiTenant {
  id: string;
  code: string;
  name: string;
  status: string;
  plan_tier: string;
  is_paid?: boolean;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: ApiUser;
  tenant: ApiTenant;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

export interface StockTransactionPayload {
  inventory_item_id: string;
  transaction_type: 'goods_receipt' | 'material_issuance' | 'adjustment_positive' | 'adjustment_negative' | 'transfer_in' | 'transfer_out';
  direction: 'IN' | 'OUT';
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_number?: string;
  notes?: string;
  batch_number?: string;
  roll_number?: string;
  idempotency_key?: string;
}

export class ApiError extends Error {
  public status: number;
  public errorCode?: string;
  public errors?: Record<string, string[]>;

  constructor(message: string, status: number, errorCode?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.errors = errors;
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private currentTenantId: string | null = null;
  private onUnauthorizedCallback?: () => void;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    this.loadPersistedAuth();
  }

  private loadPersistedAuth(): void {
    try {
      this.token = localStorage.getItem('garmentos_auth_token');
      this.currentTenantId = localStorage.getItem('garmentos_tenant_id');
    } catch {
      // In private browsing mode or restrictive storage environments
      this.token = null;
      this.currentTenantId = null;
    }
  }

  public setOnUnauthorized(callback: () => void): void {
    this.onUnauthorizedCallback = callback;
  }

  public setAuth(token: string, tenantId: string): void {
    this.token = token;
    this.currentTenantId = tenantId;
    try {
      localStorage.setItem('garmentos_auth_token', token);
      localStorage.setItem('garmentos_tenant_id', tenantId);
    } catch {
      // Storage unavailable
    }
  }

  public clearAuth(): void {
    this.token = null;
    this.currentTenantId = null;
    try {
      localStorage.removeItem('garmentos_auth_token');
      localStorage.removeItem('garmentos_tenant_id');
      localStorage.removeItem('garmentos_user_profile');
      localStorage.removeItem('garmentos_tenant_profile');
    } catch {
      // Storage unavailable
    }
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public getTenantId(): string | null {
    return this.currentTenantId;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.currentTenantId && !headers['X-Tenant-ID']) {
      headers['X-Tenant-ID'] = this.currentTenantId;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError) {
      throw new ApiError(
        'تعذر الاتصال بخادم GarmentOS Cloud. يرجى التحقق من اتصال الإنترنت أو حالة الخادم.',
        0,
        'NetworkError'
      );
    }

    // معالجة انتهاء الجلسة أو عدم المصادقة
    if (response.status === 401) {
      this.clearAuth();
      if (this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback();
      }
      const data = await response.json().catch(() => ({}));
      throw new ApiError(
        data.message || 'انتهت صلاحية الجلسة أو أنك غير مسجل الدخول.',
        401,
        data.error || 'Unauthenticated'
      );
    }

    // قراءة البيانات من الاستجابة
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json().catch(() => ({})) : null;

    if (!response.ok) {
      const message = data?.message || `فشل الطلب مع رمز الحالة ${response.status}`;
      throw new ApiError(message, response.status, data?.error, data?.errors);
    }

    return data as T;
  }

  // --- Auth Endpoints ---
  public auth = {
    login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
      const res = await this.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (res.access_token && res.tenant?.id) {
        this.setAuth(res.access_token, res.tenant.id);
        try {
          localStorage.setItem('garmentos_user_profile', JSON.stringify(res.user));
          localStorage.setItem('garmentos_tenant_profile', JSON.stringify(res.tenant));
        } catch {}
      }

      return res;
    },

    logout: async (): Promise<{ message: string }> => {
      try {
        const res = await this.request<{ message: string }>('/auth/logout', {
          method: 'POST',
        });
        return res;
      } finally {
        this.clearAuth();
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
      }
    },

    registerCompany: async (payload: { company_name: string; subdomain?: string; owner_name: string; email: string; password: string; phone?: string; plan_tier?: string }): Promise<LoginResponse> => {
      const res = await this.request<any>('/auth/register-company', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.access_token && res.tenant?.id) {
        this.setAuth(res.access_token, res.tenant.id);
        try {
          localStorage.setItem('garmentos_user_profile', JSON.stringify(res.user));
          localStorage.setItem('garmentos_tenant_profile', JSON.stringify(res.tenant));
        } catch {}
      }

      return res;
    },

    getStoredUser: (): ApiUser | null => {
      try {
        const userStr = localStorage.getItem('garmentos_user_profile');
        return userStr ? JSON.parse(userStr) : null;
      } catch {
        return null;
      }
    },

    getStoredTenant: (): ApiTenant | null => {
      try {
        const tStr = localStorage.getItem('garmentos_tenant_profile');
        return tStr ? JSON.parse(tStr) : null;
      } catch {
        return null;
      }
    },
  };

  // --- Tenant Profile ---
  public tenant = {
    getProfile: async (): Promise<{ tenant: ApiTenant; user?: ApiUser }> => {
      return this.request<{ tenant: ApiTenant; user?: ApiUser }>('/tenant/profile');
    },
  };

  // --- Branches Endpoints ---
  public branches = {
    getBranches: async (): Promise<{ branches: any[] }> => {
      return this.request<{ branches: any[] }>('/branches');
    },

    createBranch: async (payload: { name: string; code: string; type: string; is_main?: boolean; address?: string; phone?: string }): Promise<{ message: string; branch: any }> => {
      return this.request<{ message: string; branch: any }>('/branches', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Garment Models Endpoints ---
  public models = {
    getModels: async (params: { category?: string; search?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.category && params.category !== 'all') query.append('category', params.category);
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/models${qs ? `?${qs}` : ''}`);
    },

    createModel: async (payload: any): Promise<{ message: string; model: any; generated_variants_count: number }> => {
      return this.request<{ message: string; model: any; generated_variants_count: number }>('/models', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getSizes: async (): Promise<{ sizes: any[] }> => {
      return this.request<{ sizes: any[] }>('/sizes');
    },

    getColors: async (): Promise<{ colors: any[] }> => {
      return this.request<{ colors: any[] }>('/colors');
    },
  };

  // --- Suppliers Endpoints ---
  public suppliers = {
    getSuppliers: async (params: { search?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/suppliers${qs ? `?${qs}` : ''}`);
    },

    createSupplier: async (payload: any): Promise<{ message: string; supplier: any }> => {
      return this.request<{ message: string; supplier: any }>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Procurement Endpoints ---
  public procurement = {
    getPurchaseOrders: async (params: { status?: string; supplier_id?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.supplier_id) query.append('supplier_id', params.supplier_id);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/purchase-orders${qs ? `?${qs}` : ''}`);
    },

    createPurchaseOrder: async (payload: any): Promise<{ message: string; purchase_order: any }> => {
      return this.request<{ message: string; purchase_order: any }>('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    approvePurchaseOrder: async (id: string): Promise<{ message: string; purchase_order: any }> => {
      return this.request<{ message: string; purchase_order: any }>(`/purchase-orders/${id}/approve`, {
        method: 'POST',
      });
    },

    getGoodsReceipts: async (params: { purchase_order_id?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.purchase_order_id) query.append('purchase_order_id', params.purchase_order_id);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/goods-receipts${qs ? `?${qs}` : ''}`);
    },

    createGoodsReceipt: async (payload: any, idempotencyKey?: string): Promise<{ message: string; is_duplicate: boolean; goods_receipt_note: any }> => {
      const headers: Record<string, string> = {};
      if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
      return this.request<{ message: string; is_duplicate: boolean; goods_receipt_note: any }>('/goods-receipts', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },

    getSupplierInvoices: async (params: { matching_status?: string; supplier_id?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.matching_status && params.matching_status !== 'all') query.append('matching_status', params.matching_status);
      if (params.supplier_id) query.append('supplier_id', params.supplier_id);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/supplier-invoices${qs ? `?${qs}` : ''}`);
    },

    createSupplierInvoice: async (payload: any, idempotencyKey?: string): Promise<{ message: string; is_duplicate: boolean; supplier_invoice: any }> => {
      const headers: Record<string, string> = {};
      if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
      return this.request<{ message: string; is_duplicate: boolean; supplier_invoice: any }>('/supplier-invoices', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Production Endpoints ---
  public production = {
    getProductionOrders: async (): Promise<{ success: boolean; data: any[] }> => {
      return this.request<{ success: boolean; data: any[] }>('/production-orders');
    },

    createProductionOrder: async (payload: any, idempotencyKey?: string): Promise<{ success: boolean; message: string; is_duplicate: boolean; data: any }> => {
      const headers: Record<string, string> = {};
      if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
      return this.request<{ success: boolean; message: string; is_duplicate: boolean; data: any }>('/production-orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },

    approveProductionOrder: async (id: string): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/production-orders/${id}/approve`, {
        method: 'POST',
      });
    },

    getCuttingOrders: async (): Promise<{ success: boolean; data: any[] }> => {
      return this.request<{ success: boolean; data: any[] }>('/cutting-orders');
    },

    createCuttingOrder: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/cutting-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getBundles: async (params: { production_order_id?: string; current_stage_code?: string; status?: string } = {}): Promise<{ success: boolean; data: any[] }> => {
      const query = new URLSearchParams();
      if (params.production_order_id) query.append('production_order_id', params.production_order_id);
      if (params.current_stage_code) query.append('current_stage_code', params.current_stage_code);
      if (params.status) query.append('status', params.status);
      const qs = query.toString();
      return this.request<{ success: boolean; data: any[] }>(`/bundles${qs ? `?${qs}` : ''}`);
    },

    transferBundle: async (id: string, payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/bundles/${id}/transfer`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getQualityInspections: async (params: { production_order_id?: string } = {}): Promise<{ success: boolean; data: any[] }> => {
      const query = new URLSearchParams();
      if (params.production_order_id) query.append('production_order_id', params.production_order_id);
      const qs = query.toString();
      return this.request<{ success: boolean; data: any[] }>(`/quality-inspections${qs ? `?${qs}` : ''}`);
    },

    createQualityInspection: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/quality-inspections', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getBoms: async (params: { garment_model_id?: string } = {}): Promise<{ success: boolean; data: any[] }> => {
      const query = new URLSearchParams();
      if (params.garment_model_id) query.append('garment_model_id', params.garment_model_id);
      const qs = query.toString();
      return this.request<{ success: boolean; data: any[] }>(`/boms${qs ? `?${qs}` : ''}`);
    },

    createBom: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/boms', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    approveBom: async (id: string): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/boms/${id}/approve`, {
        method: 'POST',
      });
    },
  };

  // --- Subcontracting & CMT Endpoints ---
  public subcontracting = {
    getCustomers: async (): Promise<{ success: boolean; data: any[] }> => {
      return this.request<{ success: boolean; data: any[] }>('/subcontracting/customers');
    },

    createCustomer: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/subcontracting/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getJobs: async (params: { status?: string; service_type?: string } = {}): Promise<{ success: boolean; data: any[] }> => {
      const query = new URLSearchParams();
      if (params.status) query.append('status', params.status);
      if (params.service_type) query.append('service_type', params.service_type);
      const qs = query.toString();
      return this.request<{ success: boolean; data: any[] }>(`/subcontracting/jobs${qs ? `?${qs}` : ''}`);
    },

    createJob: async (payload: any, idempotencyKey?: string): Promise<{ success: boolean; message: string; is_duplicate: boolean; data: any }> => {
      const headers: Record<string, string> = {};
      if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
      return this.request<{ success: boolean; message: string; is_duplicate: boolean; data: any }>('/subcontracting/jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },

    confirmJob: async (id: string): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/subcontracting/jobs/${id}/confirm`, {
        method: 'POST',
      });
    },

    getMaterialReceipts: async (): Promise<{ success: boolean; data: any[] }> => {
      return this.request<{ success: boolean; data: any[] }>('/subcontracting/material-receipts');
    },

    createMaterialReceipt: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/subcontracting/material-receipts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getExternalOperations: async (): Promise<{ success: boolean; data: any[] }> => {
      return this.request<{ success: boolean; data: any[] }>('/subcontracting/external-operations');
    },

    dispatchExternalOp: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/subcontracting/external-operations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    receiveExternalOp: async (id: string, payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/subcontracting/external-operations/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getDeliveryNotes: async (): Promise<{ success: boolean; data: any[] }> => {
      return this.request<{ success: boolean; data: any[] }>('/subcontracting/delivery-notes');
    },

    createDeliveryNote: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/subcontracting/delivery-notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getInvoices: async (): Promise<{ success: boolean; data: any[] }> => {
      return this.request<{ success: boolean; data: any[] }>('/subcontracting/invoices');
    },

    createInvoice: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/subcontracting/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    recordPayment: async (id: string, payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/subcontracting/invoices/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Inventory Endpoints ---
  public inventory = {
    getWarehouses: async (): Promise<{ warehouses: any[] }> => {
      return this.request<{ warehouses: any[] }>('/warehouses');
    },

    getItems: async (params: { warehouse_id?: string; item_type?: string; search?: string; page?: number; per_page?: number } = {}): Promise<PaginatedResponse<any>> => {
      const query = new URLSearchParams();
      if (params.warehouse_id && params.warehouse_id !== 'all') query.append('warehouse_id', params.warehouse_id);
      if (params.item_type && params.item_type !== 'all') query.append('item_type', params.item_type);
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());

      const qs = query.toString();
      return this.request<PaginatedResponse<any>>(`/inventory/items${qs ? `?${qs}` : ''}`);
    },

    getTransactions: async (params: { page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/inventory/transactions${qs ? `?${qs}` : ''}`);
    },

    recordTransaction: async (payload: StockTransactionPayload): Promise<{ message: string; is_duplicate: boolean; transaction: any }> => {
      const headers: Record<string, string> = {};
      if (payload.idempotency_key) {
        headers['X-Idempotency-Key'] = payload.idempotency_key;
      }

      return this.request<{ message: string; is_duplicate: boolean; transaction: any }>('/inventory/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },
  };

  public platformAdmin = {
    getOverview: async (): Promise<{ metrics: any; recent_audits: any[]; timestamp: string }> => {
      return this.request('/platform-admin/overview');
    },

    getTenants: async (params: { page?: number; per_page?: number; search?: string; status?: string; plan_tier?: string } = {}): Promise<PaginatedResponse<any>> => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      if (params.search) query.append('search', params.search);
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.plan_tier && params.plan_tier !== 'all') query.append('plan_tier', params.plan_tier);
      const qs = query.toString();
      return this.request(`/platform-admin/tenants${qs ? `?${qs}` : ''}`);
    },

    getTenant: async (id: string): Promise<{ tenant: any; audit_logs: any[] }> => {
      return this.request(`/platform-admin/tenants/${id}`);
    },

    suspendTenant: async (id: string, reason: string): Promise<{ status: string; message: string; tenant: any }> => {
      return this.request(`/platform-admin/tenants/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },

    activateSubscription: async (id: string, payload: { authorization_code: string; authorized_by: string; reason: string; plan_tier: string }): Promise<any> => {
      return this.request(`/platform-admin/tenants/${id}/activate-subscription`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getAuditLogs: async (params: { page?: number; per_page?: number; action?: string; tenant_id?: string } = {}): Promise<PaginatedResponse<any>> => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      if (params.action) query.append('action', params.action);
      if (params.tenant_id) query.append('tenant_id', params.tenant_id);
      const qs = query.toString();
      return this.request(`/platform-admin/audit-logs${qs ? `?${qs}` : ''}`);
    },

    getDomains: async (params: { page?: number; per_page?: number; search?: string } = {}): Promise<{ domains: PaginatedResponse<any>; base_domain: string }> => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      if (params.search) query.append('search', params.search);
      const qs = query.toString();
      return this.request(`/platform-admin/domains${qs ? `?${qs}` : ''}`);
    },

    updateSubdomain: async (id: string, subdomain: string): Promise<{ message: string; tenant_id: string; subdomain: string; full_domain: string }> => {
      return this.request(`/platform-admin/tenants/${id}/subdomain`, {
        method: 'PUT',
        body: JSON.stringify({ subdomain }),
      });
    },

    updateCustomDomain: async (id: string, custom_domain: string | null): Promise<{ message: string; tenant_id: string; custom_domain: string | null; domain_settings: any }> => {
      return this.request(`/platform-admin/tenants/${id}/custom-domain`, {
        method: 'PUT',
        body: JSON.stringify({ custom_domain }),
      });
    },

    verifyCustomDomain: async (id: string, mock_verify: boolean = false): Promise<{ verified: boolean; status: string; message: string; domain_settings: any }> => {
      return this.request(`/platform-admin/tenants/${id}/custom-domain/verify`, {
        method: 'POST',
        body: JSON.stringify({ mock_verify }),
      });
    },

    toggleDomainStatus: async (id: string): Promise<{ message: string; custom_domain_enabled: boolean }> => {
      return this.request(`/platform-admin/tenants/${id}/custom-domain/toggle`, {
        method: 'POST',
      });
    },
  };

  // --- Sales & POS Endpoints ---
  public sales = {
    getQuotations: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/quotations?page=${page}`);
    },
    createQuotation: async (payload: any): Promise<{ message: string; quotation: any }> => {
      return this.request('/sales/quotations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getOrders: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/orders?page=${page}`);
    },
    createOrder: async (payload: any): Promise<{ message: string; order: any }> => {
      return this.request('/sales/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    reserveOrderStock: async (id: string): Promise<{ message: string; order: any }> => {
      return this.request(`/sales/orders/${id}/reserve`, {
        method: 'POST',
      });
    },
    fulfillOrder: async (id: string): Promise<{ message: string; order: any }> => {
      return this.request(`/sales/orders/${id}/fulfill`, {
        method: 'POST',
      });
    },
    getInvoices: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/invoices?page=${page}`);
    },
    processPosSale: async (payload: any): Promise<{ message: string; invoice: any }> => {
      return this.request('/pos/sale', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getPosSessions: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/pos/sessions?page=${page}`);
    },
    openPosSession: async (payload: { opening_cash: number; notes?: string }): Promise<{ message: string; session: any }> => {
      return this.request('/pos/sessions/open', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    closePosSession: async (id: string, payload: { closing_cash: number; notes?: string }): Promise<{ message: string; session: any }> => {
      return this.request(`/pos/sessions/${id}/close`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getDeliveryNotes: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/delivery-notes?page=${page}`);
    },
    createDeliveryNote: async (payload: any): Promise<{ message: string; delivery_note: any }> => {
      return this.request('/sales/delivery-notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getReturns: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/returns?page=${page}`);
    },
    createReturn: async (payload: any): Promise<{ message: string; return: any }> => {
      return this.request('/sales/returns', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Accounting & Costing Endpoints ---
  public accounting = {
    getAccounts: async (): Promise<any[]> => {
      return this.request('/accounting/accounts');
    },
    createAccount: async (payload: { code: string; name: string; type: string; category: string }): Promise<{ message: string; account: any }> => {
      return this.request('/accounting/accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getJournalEntries: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/accounting/journal-entries?page=${page}`);
    },
    createJournalEntry: async (payload: { description: string; entry_date?: string; reference_type?: string; lines: Array<{ account_id: string; debit: number; credit: number; description?: string }> }): Promise<{ message: string; entry: any }> => {
      return this.request('/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getPaymentVouchers: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/accounting/payment-vouchers?page=${page}`);
    },
    createPaymentVoucher: async (payload: any): Promise<{ message: string; voucher: any }> => {
      return this.request('/accounting/payment-vouchers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getCostSheets: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/accounting/cost-sheets?page=${page}`);
    },
    calculateCost: async (productionOrderId: string): Promise<{ message: string; cost_sheet: any }> => {
      return this.request(`/accounting/cost-sheets/${productionOrderId}/calculate`, {
        method: 'POST',
      });
    },
  };

  // --- HR & Payroll Endpoints ---
  public hr = {
    getEmployees: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/hr/employees?page=${page}`);
    },
    createEmployee: async (payload: any): Promise<{ message: string; employee: any }> => {
      return this.request('/hr/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getPieceRates: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/hr/piece-rates?page=${page}`);
    },
    createPieceRate: async (payload: any): Promise<{ message: string; piece_rate: any }> => {
      return this.request('/hr/piece-rates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getPieceWorkLogs: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/hr/piece-work-logs?page=${page}`);
    },
    createPieceWorkLog: async (payload: any): Promise<{ message: string; log: any }> => {
      return this.request('/hr/piece-work-logs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getPayrolls: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/hr/payrolls?page=${page}`);
    },
    generatePayroll: async (payload: { payroll_period: string; period_start: string; period_end: string }): Promise<{ message: string; payroll: any }> => {
      return this.request('/hr/payrolls/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Maintenance & Equipment Endpoints ---
  public maintenance = {
    getMachines: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/maintenance/machines?page=${page}`);
    },
    createMachine: async (payload: any): Promise<{ message: string; machine: any }> => {
      return this.request('/maintenance/machines', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateMachine: async (id: string, payload: any): Promise<{ message: string; machine: any }> => {
      return this.request(`/maintenance/machines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    getWorkOrders: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/maintenance/work-orders?page=${page}`);
    },
    createWorkOrder: async (payload: any): Promise<{ message: string; work_order: any }> => {
      return this.request('/maintenance/work-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    completeWorkOrder: async (id: string, payload: { resolution_notes: string; downtime_hours?: number; spare_parts?: any[] }): Promise<{ message: string; work_order: any }> => {
      return this.request(`/maintenance/work-orders/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getDowntimeSummary: async (): Promise<any> => {
      return this.request('/maintenance/downtime-summary');
    },
  };

  // --- Storefront Orders (ERP side) ---
  public storefront = {
    getOrders: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/storefront/orders?page=${page}`);
    },
    updateOrderStatus: async (id: string, status: string): Promise<{ message: string; order: any }> => {
      return this.request(`/storefront/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  };

  public public = {
    submitContact: async (payload: { name: string; email: string; phone?: string; company_name?: string; subject?: string; message: string }): Promise<{ success: boolean; message: string }> => {
      return this.request('/public/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}

export const api = new ApiClient();
