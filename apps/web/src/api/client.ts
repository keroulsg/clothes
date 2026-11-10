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

import type { Customer, CustomerStatement } from '../types';

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
  subdomain?: string;
  custom_domain?: string;
  status: string;
  plan_tier: string;
  is_paid?: boolean;
  settings?: Record<string, any>;
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

  public setAuth(token: string, tenantId?: string | null): void {
    this.token = token;
    this.currentTenantId = tenantId || null;
    try {
      localStorage.setItem('garmentos_auth_token', token);
      if (tenantId) {
        localStorage.setItem('garmentos_tenant_id', tenantId);
      } else {
        localStorage.removeItem('garmentos_tenant_id');
      }
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
      ...(options.headers as Record<string, string> || {}),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

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

  public async downloadFile(endpoint: string, defaultFilename: string): Promise<void> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.currentTenantId) {
      headers['X-Tenant-ID'] = this.currentTenantId;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new ApiError('فشل تنزيل التقرير المالي من الخادم', response.status, 'DownloadError');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  }

  // --- Auth Endpoints ---
  public auth = {
    login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
      const res = await this.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (res.access_token) {
        this.setAuth(res.access_token, res.tenant?.id || null);
        try {
          localStorage.setItem('garmentos_user_profile', JSON.stringify(res.user));
          if (res.tenant) {
            localStorage.setItem('garmentos_tenant_profile', JSON.stringify(res.tenant));
          } else {
            localStorage.removeItem('garmentos_tenant_profile');
          }
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

    registerRequester: async (payload: {
      tenant_name: string;
      brand_name?: string;
      owner_name: string;
      email: string;
      phone: string;
      password: string;
      password_confirmation: string;
      city?: string;
    }): Promise<LoginResponse> => {
      const res = await this.request<any>('/auth/register-requester', {
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

  // --- Tenant Profile & Settings ---
  public tenant = {
    getProfile: async (): Promise<{ tenant: ApiTenant; user?: ApiUser }> => {
      return this.request<{ tenant: ApiTenant; user?: ApiUser }>('/tenant/profile');
    },
    getCostingSettings: async (): Promise<{
      tenant_id: string;
      manufacturing_overhead_rate: number;
      manufacturing_overhead_percentage: number;
      default_rate: number;
      is_customized: boolean;
    }> => {
      return this.request('/tenant/settings/costing');
    },
    updateCostingSettings: async (payload: {
      manufacturing_overhead_rate: number;
    }): Promise<{
      message: string;
      tenant_id: string;
      manufacturing_overhead_rate: number;
      manufacturing_overhead_percentage: number;
    }> => {
      return this.request('/tenant/settings/costing', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    getTaxSettings: async (): Promise<{ tax_settings: { enabled: boolean; rate: number; tax_number?: string; tax_name?: string } }> => {
      return this.request('/tenant/settings/tax');
    },

    updateTaxSettings: async (payload: { enabled: boolean; rate: number; tax_number?: string; tax_name?: string }): Promise<{ message: string; tax_settings: any }> => {
      return this.request('/tenant/settings/tax', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Branches Endpoints ---
  public branches = {
    getBranches: async (): Promise<{ branches: any[] }> => {
      return this.request<{ branches: any[] }>('/branches');
    },

    createBranch: async (payload: { name: string; code: string; type: string; is_main?: boolean; address?: string; phone?: string; manager_name?: string }): Promise<{ message: string; branch: any }> => {
      return this.request<{ message: string; branch: any }>('/branches', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updateBranch: async (id: string, payload: any): Promise<{ message: string; branch: any }> => {
      return this.request<{ message: string; branch: any }>(`/branches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteBranch: async (id: string): Promise<{ message: string }> => {
      return this.request<{ message: string }>(`/branches/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // --- Clothing Categories Endpoints (Batch 1) ---
  public categories = {
    getCategories: async (params: { search?: string; is_active?: boolean; root_only?: boolean } = {}): Promise<{ categories: any[] }> => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
      if (params.root_only) query.append('root_only', '1');
      const qs = query.toString();
      return this.request<{ categories: any[] }>(`/categories${qs ? `?${qs}` : ''}`);
    },

    createCategory: async (payload: { name_ar: string; name_en?: string; code?: string; parent_id?: string; description?: string; is_active?: boolean }): Promise<{ message: string; category: any }> => {
      return this.request<{ message: string; category: any }>('/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getCategory: async (id: string): Promise<{ category: any }> => {
      return this.request<{ category: any }>(`/categories/${id}`);
    },

    updateCategory: async (id: string, payload: any): Promise<{ message: string; category: any }> => {
      return this.request<{ message: string; category: any }>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteCategory: async (id: string): Promise<{ message: string; deleted?: boolean; deactivated?: boolean }> => {
      return this.request<{ message: string; deleted?: boolean; deactivated?: boolean }>(`/categories/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // --- Garment Models & Sizing Endpoints ---
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

    getModel: async (id: string): Promise<{ model: any }> => {
      return this.request<{ model: any }>(`/models/${id}`);
    },

    createModel: async (payload: any): Promise<{ message: string; model: any; generated_variants_count: number }> => {
      return this.request<{ message: string; model: any; generated_variants_count: number }>('/models', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updateModel: async (id: string, payload: any): Promise<{ message: string; model: any }> => {
      return this.request<{ message: string; model: any }>(`/models/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteModel: async (id: string): Promise<{ message: string; deleted: boolean }> => {
      return this.request<{ message: string; deleted: boolean }>(`/models/${id}`, {
        method: 'DELETE',
      });
    },

    // --- Dynamic Size Guide & Size Categories ---
    getSizeCategories: async (params: { search?: string; is_active?: boolean | string } = {}): Promise<{ categories: any[] }> => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
      const qs = query.toString();
      return this.request<{ categories: any[] }>(`/size-categories${qs ? `?${qs}` : ''}`);
    },

    createSizeCategory: async (payload: { name: string; description?: string; sort_order?: number; is_active?: boolean }): Promise<{ message: string; category: any }> => {
      return this.request<{ message: string; category: any }>('/size-categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getSizeCategory: async (id: string): Promise<{ category: any; is_used_in_production: boolean }> => {
      return this.request<{ category: any; is_used_in_production: boolean }>(`/size-categories/${id}`);
    },

    updateSizeCategory: async (id: string, payload: any): Promise<{ message: string; category: any }> => {
      return this.request<{ message: string; category: any }>(`/size-categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteSizeCategory: async (id: string): Promise<{ message: string; deleted: boolean }> => {
      return this.request<{ message: string; deleted: boolean }>(`/size-categories/${id}`, {
        method: 'DELETE',
      });
    },

    getSizes: async (params: { size_category_id?: string; category?: string; search?: string; is_active?: boolean | string } = {}): Promise<{ sizes: any[] }> => {
      const query = new URLSearchParams();
      if (params.size_category_id && params.size_category_id !== 'all') query.append('size_category_id', params.size_category_id);
      if (params.category && params.category !== 'all') query.append('category', params.category);
      if (params.search) query.append('search', params.search);
      if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
      const qs = query.toString();
      return this.request<{ sizes: any[] }>(`/sizes${qs ? `?${qs}` : ''}`);
    },

    createSize: async (payload: { name: string; size_category_id?: string; category?: string; sort_order?: number; is_active?: boolean }): Promise<{ message: string; size: any }> => {
      return this.request<{ message: string; size: any }>('/sizes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updateSize: async (id: string, payload: any): Promise<{ message: string; size: any }> => {
      return this.request<{ message: string; size: any }>(`/sizes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteSize: async (id: string): Promise<{ message: string; deleted: boolean }> => {
      return this.request<{ message: string; deleted: boolean }>(`/sizes/${id}`, {
        method: 'DELETE',
      });
    },

    getColors: async (params: { search?: string } = {}): Promise<{ colors: any[] }> => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      const qs = query.toString();
      return this.request<{ colors: any[] }>(`/colors${qs ? `?${qs}` : ''}`);
    },

    createColor: async (payload: { name: string; color_code: string; pantone_ref?: string }): Promise<{ message: string; color: any }> => {
      return this.request<{ message: string; color: any }>('/colors', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updateColor: async (id: string, payload: any): Promise<{ message: string; color: any }> => {
      return this.request<{ message: string; color: any }>(`/colors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteColor: async (id: string): Promise<{ message: string; deleted: boolean }> => {
      return this.request<{ message: string; deleted: boolean }>(`/colors/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // --- Approved Colors Catalog (Batch 1) ---
  public colors = {
    getColors: async (params: { search?: string } = {}): Promise<{ colors: any[] }> => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      const qs = query.toString();
      return this.request<{ colors: any[] }>(`/colors${qs ? `?${qs}` : ''}`);
    },
    createColor: async (payload: { name: string; color_code: string; pantone_ref?: string }): Promise<{ message: string; color: any }> => {
      return this.request<{ message: string; color: any }>('/colors', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateColor: async (id: string, payload: any): Promise<{ message: string; color: any }> => {
      return this.request<{ message: string; color: any }>(`/colors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    deleteColor: async (id: string): Promise<{ message: string; deleted: boolean }> => {
      return this.request<{ message: string; deleted: boolean }>(`/colors/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // --- Products Catalog Endpoints (Batch 1 WooCommerce-level) ---
  public products = {
    getProducts: async (params: { search?: string; category_id?: string; status?: string; stock_visibility?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.category_id && params.category_id !== 'all') query.append('category_id', params.category_id);
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.stock_visibility && params.stock_visibility !== 'all') query.append('stock_visibility', params.stock_visibility);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/products${qs ? `?${qs}` : ''}`);
    },

    createProduct: async (payload: any): Promise<{ message: string; product: any }> => {
      return this.request<{ message: string; product: any }>('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    uploadImage: async (file: File, productId?: string): Promise<{ message: string; url: string; path: string; filename: string }> => {
      const formData = new FormData();
      formData.append('image', file);
      if (productId) formData.append('product_id', productId);
      return this.request<{ message: string; url: string; path: string; filename: string }>('/products/upload-image', {
        method: 'POST',
        body: formData,
      });
    },

    uploadImages: async (files: File[], productId?: string): Promise<{ message: string; images: Array<{ id: string; url: string; path: string; filename: string; is_primary: boolean; sort_order: number }>; url: string }> => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images[]', file);
      });
      if (productId) formData.append('product_id', productId);
      return this.request<{ message: string; images: Array<{ id: string; url: string; path: string; filename: string; is_primary: boolean; sort_order: number }>; url: string }>('/products/upload-images', {
        method: 'POST',
        body: formData,
      });
    },

    deleteImage: async (payload: { url?: string; path?: string; product_id?: string }): Promise<{ message: string }> => {
      return this.request<{ message: string }>('/products/delete-image', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getPosItems: async (params: { search?: string } = {}): Promise<{ items: any[]; total: number }> => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      const qs = query.toString();
      return this.request<{ items: any[]; total: number }>(`/products/pos-items${qs ? `?${qs}` : ''}`);
    },

    getProduct: async (id: string): Promise<{ product: any }> => {
      return this.request<{ product: any }>(`/products/${id}`);
    },

    updateProduct: async (id: string, payload: any): Promise<{ message: string; product: any }> => {
      return this.request<{ message: string; product: any }>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteProduct: async (id: string): Promise<{ message: string; deleted?: boolean; action_taken?: string; archived?: boolean; product?: any }> => {
      return this.request<{ message: string; deleted?: boolean; action_taken?: string; archived?: boolean; product?: any }>(`/products/${id}`, {
        method: 'DELETE',
      });
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

    getSupplierStatement: async (id: string, params?: { from_date?: string; to_date?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.from_date && params.from_date !== 'undefined') q.append('from_date', params.from_date);
      if (params?.to_date && params.to_date !== 'undefined') q.append('to_date', params.to_date);
      const qs = q.toString();
      return this.request(`/suppliers/${id}/statement${qs ? `?${qs}` : ''}`);
    },

    updateSupplier: async (id: string, payload: any): Promise<{ message: string; supplier: any }> => {
      return this.request<{ message: string; supplier: any }>(`/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    recordPayment: async (id: string, payload: { amount: number; payment_method: string; voucher_date?: string; reference_number?: string; supplier_invoice_id?: string; notes?: string }): Promise<{ message: string; voucher: any; supplier_current_balance: number }> => {
      return this.request<{ message: string; voucher: any; supplier_current_balance: number }>(`/suppliers/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updatePayment: async (supplierId: string, voucherId: string, payload: { amount: number; payment_method: string; voucher_date?: string; notes?: string }): Promise<{ message: string; voucher: any; supplier_current_balance: number }> => {
      return this.request<{ message: string; voucher: any; supplier_current_balance: number }>(`/suppliers/${supplierId}/payments/${voucherId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deletePayment: async (supplierId: string, voucherId: string): Promise<{ message: string; supplier_current_balance: number }> => {
      return this.request<{ message: string; supplier_current_balance: number }>(`/suppliers/${supplierId}/payments/${voucherId}`, {
        method: 'DELETE',
      });
    },

    recordInvoice: async (supplierId: string, payload: { invoice_number: string; total_amount: number; invoice_date?: string; due_date?: string; internal_reference?: string; notes?: string }): Promise<{ message: string; invoice: any; supplier_current_balance: number }> => {
      return this.request<{ message: string; invoice: any; supplier_current_balance: number }>(`/suppliers/${supplierId}/invoices`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    deleteInvoice: async (supplierId: string, invoiceId: string): Promise<{ message: string; supplier_current_balance: number }> => {
      return this.request<{ message: string; supplier_current_balance: number }>(`/suppliers/${supplierId}/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
    },

    recordDiscount: async (supplierId: string, payload: { amount: number; discount_type: string; discount_date?: string; notes?: string }): Promise<{ message: string; voucher: any; new_balance: number }> => {
      return this.request<{ message: string; voucher: any; new_balance: number }>(`/suppliers/${supplierId}/discounts`, {
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

    getRequisitions: async (params: { status?: string; priority?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.priority) query.append('priority', params.priority);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/procurement/requisitions${qs ? `?${qs}` : ''}`);
    },

    getRequisition: async (id: string): Promise<any> => {
      return this.request<any>(`/procurement/requisitions/${id}`);
    },

    createRequisition: async (payload: any): Promise<any> => {
      return this.request<any>('/procurement/requisitions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    submitRequisition: async (id: string): Promise<any> => {
      return this.request<any>(`/procurement/requisitions/${id}/submit`, {
        method: 'POST',
      });
    },

    approveRequisition: async (id: string, payload: any = {}): Promise<any> => {
      return this.request<any>(`/procurement/requisitions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    rejectRequisition: async (id: string, reason: string): Promise<any> => {
      return this.request<any>(`/procurement/requisitions/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },

    convertRequisition: async (id: string, payload: any): Promise<any> => {
      return this.request<any>(`/procurement/requisitions/${id}/convert`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    cancelRequisition: async (id: string, reason: string): Promise<any> => {
      return this.request<any>(`/procurement/requisitions/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
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

    completeProductionOrder: async (id: string): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/production-orders/${id}/complete`, {
        method: 'POST',
      });
    },

    updateProductionOrder: async (id: string, payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/production-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    cancelProductionOrder: async (id: string, cancellation_reason: string): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/production-orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellation_reason }),
      });
    },

    getCuttingOrders: async (params: { search?: string; status?: string; production_order_id?: string; fabric_source?: string; page?: number; per_page?: number } = {}): Promise<{ success: boolean; data: any[]; meta?: any }> => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.production_order_id && params.production_order_id !== 'all') query.append('production_order_id', params.production_order_id);
      if (params.fabric_source && params.fabric_source !== 'all') query.append('fabric_source', params.fabric_source);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<{ success: boolean; data: any[]; meta?: any }>(`/cutting-orders${qs ? `?${qs}` : ''}`);
    },

    createCuttingOrder: async (payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>('/cutting-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    cancelCuttingOrder: async (id: string, cancellation_reason: string): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/cutting-orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellation_reason }),
      });
    },

    archiveCuttingOrder: async (id: string): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/cutting-orders/${id}/archive`, {
        method: 'POST',
      });
    },

    getCuttingOrder: async (id: string): Promise<{ success: boolean; data: any }> => {
      return this.request<{ success: boolean; data: any }>(`/cutting-orders/${id}`);
    },

    getBundles: async (params: { production_order_id?: string; cutting_order_id?: string; current_stage_code?: string; status?: string; assigned_employee_id?: string; search?: string; page?: number; per_page?: number } = {}): Promise<{ success: boolean; data: any[]; meta?: any }> => {
      const query = new URLSearchParams();
      if (params.production_order_id && params.production_order_id !== 'all') query.append('production_order_id', params.production_order_id);
      if (params.cutting_order_id && params.cutting_order_id !== 'all') query.append('cutting_order_id', params.cutting_order_id);
      if (params.current_stage_code && params.current_stage_code !== 'all') query.append('current_stage_code', params.current_stage_code);
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.assigned_employee_id && params.assigned_employee_id !== 'all') query.append('assigned_employee_id', params.assigned_employee_id);
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<{ success: boolean; data: any[]; meta?: any }>(`/bundles${qs ? `?${qs}` : ''}`);
    },

    getBundle: async (id: string): Promise<{ success: boolean; data: any }> => {
      return this.request<{ success: boolean; data: any }>(`/bundles/${id}`);
    },

    assignBundle: async (id: string, payload: { employee_id?: string; work_group?: string; issue_date?: string; due_date?: string }): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/bundles/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getBundleHistory: async (id: string): Promise<{ success: boolean; data: { bundle: any; timeline: any[] } }> => {
      return this.request<{ success: boolean; data: { bundle: any; timeline: any[] } }>(`/bundles/${id}/history`);
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

    getCustomerDossier: async (id: string): Promise<{ success: boolean; data: any }> => {
      return this.request<{ success: boolean; data: any }>(`/subcontracting/customers/${id}`);
    },

    updateCustomer: async (id: string, payload: any): Promise<{ success: boolean; message: string; data: any }> => {
      return this.request<{ success: boolean; message: string; data: any }>(`/subcontracting/customers/${id}`, {
        method: 'PUT',
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

    createWarehouse: async (payload: {
      name: string;
      code: string;
      type: string;
      branch_id?: string;
      address?: string;
      allow_negative_stock?: boolean;
    }): Promise<{ message: string; warehouse: any }> => {
      return this.request<{ message: string; warehouse: any }>('/warehouses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getItems: async (params: {
      warehouse_id?: string;
      item_type?: string;
      category?: string;
      search?: string;
      page?: number;
      per_page?: number;
    } = {}): Promise<PaginatedResponse<any>> => {
      const query = new URLSearchParams();
      if (params.warehouse_id && params.warehouse_id !== 'all') query.append('warehouse_id', params.warehouse_id);
      if (params.item_type && params.item_type !== 'all') query.append('item_type', params.item_type);
      if (params.category && params.category !== 'all') query.append('category', params.category);
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());

      const qs = query.toString();
      return this.request<PaginatedResponse<any>>(`/inventory/items${qs ? `?${qs}` : ''}`);
    },

    createItem: async (payload: {
      warehouse_id: string;
      item_type: string;
      code: string;
      name: string;
      unit_of_measure: string;
      reorder_level?: number;
      average_cost?: number;
      initial_balance?: number;
      storage_zone?: string;
      rack_location?: string;
      shelf_bin_location?: string;
      technical_specs?: Record<string, any>;
      is_customer_owned?: boolean;
      customer_name?: string;
      variant_id?: string;
    }): Promise<{ message: string; item: any }> => {
      return this.request<{ message: string; item: any }>('/inventory/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updateItem: async (id: string, payload: {
      name?: string;
      reorder_level?: number;
      average_cost?: number;
      storage_zone?: string;
      rack_location?: string;
      shelf_bin_location?: string;
      technical_specs?: Record<string, any>;
    }): Promise<{ message: string; item: any }> => {
      return this.request<{ message: string; item: any }>(`/inventory/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    getItemLabel: async (id: string): Promise<{ success: boolean; label: any }> => {
      return this.request<{ success: boolean; label: any }>(`/inventory/items/${id}/label`);
    },

    getCustomerMaterials: async (): Promise<{ customer_materials: any[] }> => {
      return this.request<{ customer_materials: any[] }>('/inventory/customer-materials');
    },

    consumeCustomerMaterial: async (id: string, payload: { consumed_meters: number; waste_meters?: number }): Promise<{ message: string; customer_material: any }> => {
      return this.request<{ message: string; customer_material: any }>(`/inventory/customer-materials/${id}/consume`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
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

    updateWarehouse: async (id: string, payload: any): Promise<{ message: string; warehouse: any }> => {
      return this.request<{ message: string; warehouse: any }>(`/warehouses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteWarehouse: async (id: string): Promise<{ message: string }> => {
      return this.request<{ message: string }>(`/warehouses/${id}`, {
        method: 'DELETE',
      });
    },

    getWarehouseTypes: async (): Promise<{ standard_types: any[]; custom_types: any[]; all_types: any[] }> => {
      return this.request<{ standard_types: any[]; custom_types: any[]; all_types: any[] }>('/warehouse-types');
    },

    createWarehouseType: async (payload: { code: string; name: string; name_en?: string }): Promise<{ message: string; type: any }> => {
      return this.request<{ message: string; type: any }>('/warehouse-types', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getUnits: async (): Promise<{ units: any[] }> => {
      return this.request<{ units: any[] }>('/inventory/units');
    },

    createUnit: async (payload: { name: string; symbol: string; category: string; base_unit?: string; conversion_factor?: number }): Promise<{ message: string; unit: any }> => {
      return this.request<{ message: string; unit: any }>('/inventory/units', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    deleteItem: async (id: string): Promise<{ message: string }> => {
      return this.request<{ message: string }>(`/inventory/items/${id}`, {
        method: 'DELETE',
      });
    },

    getStockCard: async (id: string): Promise<any> => {
      return this.request(`/inventory/items/${id}/stock-card`);
    },

    getTransfers: async (params: { status?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/inventory/transfers${qs ? `?${qs}` : ''}`);
    },

    createTransfer: async (payload: any): Promise<{ message: string; transfer: any }> => {
      return this.request<{ message: string; transfer: any }>('/inventory/transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    dispatchTransfer: async (id: string): Promise<{ message: string; transfer: any }> => {
      return this.request<{ message: string; transfer: any }>(`/inventory/transfers/${id}/dispatch`, {
        method: 'POST',
      });
    },

    receiveTransfer: async (id: string): Promise<{ message: string; transfer: any }> => {
      return this.request<{ message: string; transfer: any }>(`/inventory/transfers/${id}/receive`, {
        method: 'POST',
      });
    },

    getCounts: async (params: { status?: string; warehouse_id?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const query = new URLSearchParams();
      if (params.status && params.status !== 'all') query.append('status', params.status);
      if (params.warehouse_id && params.warehouse_id !== 'all') query.append('warehouse_id', params.warehouse_id);
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      const qs = query.toString();
      return this.request<any>(`/inventory/counts${qs ? `?${qs}` : ''}`);
    },

    createCount: async (payload: { warehouse_id: string; count_date?: string; notes?: string; category?: string }): Promise<{ message: string; stock_count: any }> => {
      return this.request<{ message: string; stock_count: any }>('/inventory/counts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    recordCount: async (id: string, items: Array<{ item_id: string; physical_quantity: number; notes?: string }>): Promise<{ message: string; stock_count: any }> => {
      return this.request<{ message: string; stock_count: any }>(`/inventory/counts/${id}/record`, {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
    },

    approveCount: async (id: string): Promise<{ message: string; stock_count: any }> => {
      return this.request<{ message: string; stock_count: any }>(`/inventory/counts/${id}/approve`, {
        method: 'POST',
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

    reactivateTenant: async (id: string): Promise<{ status: string; message: string; tenant: any }> => {
      return this.request(`/platform-admin/tenants/${id}/reactivate`, {
        method: 'POST',
      });
    },

    updateTenantPlan: async (id: string, plan_tier: string): Promise<{ status: string; message: string; tenant: any }> => {
      return this.request(`/platform-admin/tenants/${id}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ plan_tier }),
      });
    },

    getSystemHealth: async (): Promise<any> => {
      return this.request('/platform-admin/system-health');
    },

    getUsers: async (params: { page?: number; per_page?: number; search?: string; role?: string } = {}): Promise<PaginatedResponse<any>> => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.per_page) query.append('per_page', params.per_page.toString());
      if (params.search) query.append('search', params.search);
      if (params.role && params.role !== 'all') query.append('role', params.role);
      const qs = query.toString();
      return this.request(`/platform-admin/users${qs ? `?${qs}` : ''}`);
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
    convertQuotation: async (id: string): Promise<{ message: string; sales_order?: any; order?: any }> => {
      return this.request(`/sales/quotations/${id}/convert`, {
        method: 'POST',
      });
    },
    getOrders: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/orders?page=${page}`);
    },
    getOrder: async (id: string): Promise<{ order: any; sales_order?: any }> => {
      return this.request(`/sales/orders/${id}`);
    },
    createOrder: async (payload: any): Promise<{ message: string; order: any }> => {
      return this.request('/sales/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    cancelOrder: async (id: string, reason: string): Promise<{ message: string; sales_order: any }> => {
      return this.request(`/sales/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    reserveOrderStock: async (id: string): Promise<{ message: string; order: any }> => {
      return this.request(`/sales/orders/${id}/reserve`, {
        method: 'POST',
      });
    },
    fulfillOrder: async (id: string): Promise<{ message: string; order?: any; invoice?: any }> => {
      return this.request(`/sales/orders/${id}/fulfill`, {
        method: 'POST',
      });
    },
    deliverOrder: async (id: string, payload: any): Promise<{ message: string; delivery_note: any }> => {
      return this.request(`/sales/orders/${id}/deliver`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    cancelDeliveryNote: async (id: string, reason: string): Promise<{ message: string; delivery_note: any }> => {
      return this.request(`/sales/delivery-notes/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    getInvoices: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/invoices?page=${page}`);
    },
    getInvoice: async (id: string): Promise<{ invoice: any }> => {
      return this.request(`/sales/invoices/${id}`);
    },
    cancelInvoice: async (id: string, reason: string): Promise<{ message: string; sales_invoice: any }> => {
      return this.request(`/sales/invoices/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    getPayments: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/payments?page=${page}`);
    },
    recordPayment: async (payload: { customer_id: string; amount: number; payment_method?: string; account_id?: string; sales_invoice_id?: string; allocations?: any[]; notes?: string }): Promise<{ message: string; payment_voucher: any }> => {
      return this.request('/sales/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    reversePayment: async (id: string, reason: string): Promise<{ message: string; payment_voucher: any }> => {
      return this.request(`/sales/payments/${id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    getCreditNotes: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/credit-notes?page=${page}`);
    },
    lookupBarcode: async (barcode: string): Promise<{ item: any }> => {
      return this.request(`/sales/barcode/${barcode}`);
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
    updateDeliveryNote: async (id: string, payload: any): Promise<{ message: string; delivery_note: any }> => {
      return this.request(`/sales/delivery-notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    getReturns: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/sales/returns?page=${page}`);
    },
    getReturn: async (id: string): Promise<{ sales_return: any }> => {
      return this.request(`/sales/returns/${id}`);
    },
    createReturn: async (payload: any): Promise<{ message: string; return: any }> => {
      return this.request('/sales/returns', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    refundReturn: async (id: string, payload: { amount?: number; payment_method?: string; account_id?: string; notes?: string } = {}): Promise<{ message: string; sales_return: any; payment_voucher: any; invoice: any }> => {
      return this.request(`/sales/returns/${id}/refund`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Customers & Client Master Endpoints ---
  public customers = {
    getCustomers: async (params?: { page?: number; search?: string; active_only?: boolean }): Promise<PaginatedResponse<Customer>> => {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.active_only) q.append('active_only', '1');
      return this.request(`/customers${q.toString() ? `?${q.toString()}` : ''}`);
    },
    getCustomer: async (id: string): Promise<{ customer: Customer }> => {
      return this.request(`/customers/${id}`);
    },
    createCustomer: async (payload: Partial<Customer> & { code: string; name: string }): Promise<{ message: string; customer: Customer }> => {
      return this.request('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateCustomer: async (id: string, payload: Partial<Customer>): Promise<{ message: string; customer: Customer }> => {
      return this.request(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    getCustomerStatement: async (id: string, params?: { from_date?: string; to_date?: string }): Promise<CustomerStatement> => {
      const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request(`/customers/${id}/statement${q ? `?${q}` : ''}`);
    },
    getCustomerAging: async (id: string): Promise<any> => {
      return this.request(`/customers/${id}/aging`);
    },
  };

  // --- Accounting & Costing Endpoints ---
  public accounting = {
    getAccounts: async (): Promise<any[]> => {
      return this.request('/accounting/accounts');
    },
    initDefaultAccounts: async (): Promise<{ message: string; accounts: any[] }> => {
      return this.request('/accounting/accounts/init-default', { method: 'POST' });
    },
    createAccount: async (payload: { code: string; name: string; name_en?: string; type: string; category: string; parent_id?: string; normal_balance?: string; is_control_account?: boolean; is_cash_bank?: boolean; is_postable?: boolean; notes?: string }): Promise<{ message: string; account: any }> => {
      return this.request('/accounting/accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateAccount: async (id: string, payload: Partial<{ name: string; name_en?: string; category: string; parent_id?: string; is_control_account?: boolean; is_cash_bank?: boolean; is_postable?: boolean; is_active?: boolean; notes?: string }>): Promise<{ message: string; account: any }> => {
      return this.request(`/accounting/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    getMappings: async (): Promise<any[]> => {
      return this.request('/accounting/mappings');
    },
    setMapping: async (payload: { mapping_key: string; account_id: string }): Promise<{ message: string; mapping: any }> => {
      return this.request('/accounting/mappings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getJournalEntries: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/accounting/journal-entries?page=${page}`);
    },
    createJournalEntry: async (payload: { description: string; entry_date?: string; reference_type?: string; lines: Array<{ account_id: string; debit: number; credit: number; description?: string; cost_center_id?: string }> }): Promise<{ message: string; journal_entry: any }> => {
      return this.request('/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    reverseJournalEntry: async (id: string, reversal_reason: string): Promise<{ message: string; reversal_entry: any }> => {
      return this.request(`/accounting/journal-entries/${id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reversal_reason }),
      });
    },
    getFinancialAccounts: async (): Promise<any[]> => {
      return this.request('/accounting/financial-accounts');
    },
    createFinancialAccount: async (payload: { chart_of_account_id: string; code: string; name: string; name_en?: string; type: string; account_number?: string; bank_name?: string; currency?: string; opening_balance?: number }): Promise<{ message: string; financial_account: any }> => {
      return this.request('/accounting/financial-accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getTransfers: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/accounting/transfers?page=${page}`);
    },
    createTransfer: async (payload: { from_financial_account_id: string; to_financial_account_id: string; amount: number; transfer_date?: string; reference?: string; notes?: string }): Promise<{ message: string; transfer: any }> => {
      return this.request('/accounting/transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    reverseTransfer: async (id: string, reversal_reason: string): Promise<{ message: string; transfer: any }> => {
      return this.request(`/accounting/transfers/${id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reversal_reason }),
      });
    },
    getCostCenters: async (): Promise<any[]> => {
      return this.request('/accounting/cost-centers');
    },
    createCostCenter: async (payload: { code: string; name: string; name_en?: string; parent_id?: string; description?: string }): Promise<{ message: string; cost_center: any }> => {
      return this.request('/accounting/cost-centers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getFiscalYears: async (): Promise<any[]> => {
      return this.request('/accounting/fiscal-years');
    },
    createFiscalYear: async (payload: { name: string; start_date: string; end_date: string; periods_count?: number }): Promise<{ message: string; fiscal_year: any }> => {
      return this.request('/accounting/fiscal-years', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    closeFiscalPeriod: async (id: string): Promise<{ message: string; fiscal_period: any }> => {
      return this.request(`/accounting/fiscal-periods/${id}/close`, { method: 'POST' });
    },
    reopenFiscalPeriod: async (id: string, reason: string): Promise<{ message: string; fiscal_period: any }> => {
      return this.request(`/accounting/fiscal-periods/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    closeFiscalYear: async (id: string): Promise<{ message: string; fiscal_year: any }> => {
      return this.request(`/accounting/fiscal-years/${id}/close`, { method: 'POST' });
    },
    reconcileAR: async (): Promise<any> => {
      return this.request('/accounting/reconciliation/ar');
    },
    reconcileAP: async (): Promise<any> => {
      return this.request('/accounting/reconciliation/ap');
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
    getAccountStatement: async (id: string, params?: { from_date?: string; to_date?: string }): Promise<any> => {
      const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request(`/accounting/accounts/${id}/statement${q ? `?${q}` : ''}`);
    },
    calculateCost: async (productionOrderId: string, overrides?: any): Promise<{ message: string; cost_sheet: any }> => {
      return this.request(`/accounting/cost-sheets/${productionOrderId}/calculate`, {
        method: 'POST',
        body: overrides ? JSON.stringify(overrides) : undefined,
      });
    },
    approveCostSheet: async (id: string): Promise<{ message: string; cost_sheet: any }> => {
      return this.request(`/accounting/cost-sheets/${id}/approve`, {
        method: 'POST',
      });
    },
    // Phase 08B: Financial Reporting Endpoints
    getTrialBalance: async (params?: { from_date?: string; to_date?: string }): Promise<any> => {
      const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request(`/accounting/reports/trial-balance${q ? `?${q}` : ''}`);
    },
    getIncomeStatement: async (params?: { from_date?: string; to_date?: string }): Promise<any> => {
      const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request(`/accounting/reports/income-statement${q ? `?${q}` : ''}`);
    },
    getBalanceSheet: async (params?: { as_of_date?: string }): Promise<any> => {
      const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request(`/accounting/reports/balance-sheet${q ? `?${q}` : ''}`);
    },
    getVatSummary: async (params?: { from_date?: string; to_date?: string }): Promise<any> => {
      const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request(`/accounting/reports/vat-summary${q ? `?${q}` : ''}`);
    },
    getCostVariance: async (params?: { production_order_id?: string }): Promise<any> => {
      const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request(`/accounting/reports/cost-variance${q ? `?${q}` : ''}`);
    },
    downloadReportCsv: async (reportType: string, params?: Record<string, string>): Promise<void> => {
      const query = new URLSearchParams({ ...(params || {}), export: 'csv' }).toString();
      return this.downloadFile(`/accounting/reports/${reportType}?${query}`, `${reportType}-${new Date().toISOString().slice(0, 10)}.csv`);
    },
  };

  // --- HR & Payroll Endpoints ---
  public hr = {
    getEmployees: async (page = 1, params: { search?: string; department?: string; pay_type?: string; is_active?: boolean } = {}): Promise<PaginatedResponse<any>> => {
      const searchParams = new URLSearchParams({ page: page.toString() });
      if (params.search) searchParams.append('search', params.search);
      if (params.department && params.department !== 'all') searchParams.append('department', params.department);
      if (params.pay_type && params.pay_type !== 'all') searchParams.append('pay_type', params.pay_type);
      if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
      return this.request(`/hr/employees?${searchParams.toString()}`);
    },
    getEmployee: async (id: string): Promise<any> => {
      return this.request(`/hr/employees/${id}`);
    },
    createEmployee: async (payload: any): Promise<{ message: string; employee: any }> => {
      return this.request('/hr/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateEmployee: async (id: string, payload: any): Promise<{ message: string; employee: any }> => {
      return this.request(`/hr/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    deleteEmployee: async (id: string): Promise<{ message: string; deactivated?: boolean; deleted?: boolean }> => {
      return this.request(`/hr/employees/${id}`, {
        method: 'DELETE',
      });
    },

    // --- Attendances ---
    getAttendances: async (page = 1, params: { attendance_date?: string; employee_id?: string; status?: string } = {}): Promise<PaginatedResponse<any>> => {
      const searchParams = new URLSearchParams({ page: page.toString() });
      if (params.attendance_date) searchParams.append('attendance_date', params.attendance_date);
      if (params.employee_id) searchParams.append('employee_id', params.employee_id);
      if (params.status && params.status !== 'all') searchParams.append('status', params.status);
      return this.request(`/hr/attendances?${searchParams.toString()}`);
    },
    recordAttendance: async (payload: any): Promise<{ message: string; attendance: any }> => {
      return this.request('/hr/attendances', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateAttendance: async (id: string, payload: any): Promise<{ message: string; attendance: any }> => {
      return this.request(`/hr/attendances/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    bulkAttendance: async (payload: { records: any[] }): Promise<{ success: boolean; message: string; created_count: number; errors_count: number; errors: any[]; attendances: any[] }> => {
      return this.request('/hr/attendances/bulk', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    // --- Adjustments (Advances, Bonuses, Deductions) ---
    getAdjustments: async (page = 1, params: { employee_id?: string; type?: string; status?: string } = {}): Promise<PaginatedResponse<any>> => {
      const searchParams = new URLSearchParams({ page: page.toString() });
      if (params.employee_id) searchParams.append('employee_id', params.employee_id);
      if (params.type && params.type !== 'all') searchParams.append('type', params.type);
      if (params.status && params.status !== 'all') searchParams.append('status', params.status);
      return this.request(`/hr/adjustments?${searchParams.toString()}`);
    },
    createAdjustment: async (payload: any): Promise<{ message: string; adjustment: any }> => {
      return this.request('/hr/adjustments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    approveAdjustment: async (id: string): Promise<{ message: string; adjustment: any }> => {
      return this.request(`/hr/adjustments/${id}/approve`, {
        method: 'POST',
      });
    },
    rejectAdjustment: async (id: string, rejection_reason: string): Promise<{ message: string; adjustment: any }> => {
      return this.request(`/hr/adjustments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason }),
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
    getPayroll: async (id: string): Promise<any> => {
      return this.request(`/hr/payrolls/${id}`);
    },
    generatePayroll: async (payload: { payroll_period: string; period_start: string; period_end: string }): Promise<{ message: string; payroll: any }> => {
      return this.request('/hr/payrolls/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    recalculatePayroll: async (id: string): Promise<{ message: string; payroll: any }> => {
      return this.request(`/hr/payrolls/${id}/recalculate`, {
        method: 'POST',
      });
    },
    deletePayroll: async (id: string): Promise<{ message: string }> => {
      return this.request(`/hr/payrolls/${id}`, {
        method: 'DELETE',
      });
    },
    approvePayroll: async (id: string): Promise<{ message: string; payroll: any }> => {
      return this.request(`/hr/payrolls/${id}/approve`, {
        method: 'POST',
      });
    },
    rejectPayroll: async (id: string, rejection_reason: string): Promise<{ message: string; payroll: any }> => {
      return this.request(`/hr/payrolls/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason }),
      });
    },
    finalizePayroll: async (id: string): Promise<{ message: string; payroll: any }> => {
      return this.request(`/hr/payrolls/${id}/finalize`, {
        method: 'POST',
      });
    },
    markPayrollPaid: async (id: string, payload?: { amount?: number; payment_date?: string; payment_method?: string; reference_number?: string; notes?: string; employee_id?: string }): Promise<{ message: string; payroll: any; payment?: any }> => {
      return this.request(`/hr/payrolls/${id}/pay`, {
        method: 'POST',
        body: payload ? JSON.stringify(payload) : undefined,
      });
    },
    getPayrollPayments: async (id: string): Promise<any[]> => {
      return this.request(`/hr/payrolls/${id}/payments`);
    },
    getPayslip: async (payrollId: string, itemId: string): Promise<{ success: boolean; data: any }> => {
      return this.request(`/hr/payrolls/${payrollId}/items/${itemId}/payslip`);
    },
    approvePieceWorkLog: async (id: string): Promise<{ message: string; work_log: any }> => {
      return this.request(`/hr/piece-work-logs/${id}/approve`, {
        method: 'POST',
      });
    },
    rejectPieceWorkLog: async (id: string, rejection_reason: string): Promise<{ message: string; work_log: any }> => {
      return this.request(`/hr/piece-work-logs/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason }),
      });
    },
    getDefectAdjustments: async (page = 1, params: { status?: string; employee_id?: string; production_order_id?: string } = {}): Promise<PaginatedResponse<any>> => {
      const searchParams = new URLSearchParams({ page: page.toString() });
      if (params.status) searchParams.append('status', params.status);
      if (params.employee_id) searchParams.append('employee_id', params.employee_id);
      if (params.production_order_id) searchParams.append('production_order_id', params.production_order_id);
      return this.request(`/hr/defect-adjustments?${searchParams.toString()}`);
    },
    createDefectAdjustment: async (payload: {
      employee_id: string;
      production_order_id: string;
      cutting_bundle_id?: string;
      quality_defect_id?: string;
      quality_inspection_id?: string;
      production_stage_id?: string;
      investigation_notes?: string;
      proposed_penalty_amount: number;
      adjustment_reason: string;
    }): Promise<{ message: string; defect_adjustment: any }> => {
      return this.request('/hr/defect-adjustments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    approveDefectAdjustment: async (id: string, payload?: { approved_amount?: number }): Promise<{ message: string; defect_adjustment: any }> => {
      return this.request(`/hr/defect-adjustments/${id}/approve`, {
        method: 'POST',
        body: payload ? JSON.stringify(payload) : undefined,
      });
    },
    rejectDefectAdjustment: async (id: string, payload: { rejection_reason: string }): Promise<{ message: string; defect_adjustment: any }> => {
      return this.request(`/hr/defect-adjustments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    recordWorkerObjection: async (id: string, payload: { objection_notes: string }): Promise<{ message: string; defect_adjustment: any }> => {
      return this.request(`/hr/defect-adjustments/${id}/object`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    reverseDefectAdjustment: async (id: string, payload: { reversal_reason: string }): Promise<{ message: string; defect_adjustment: any }> => {
      return this.request(`/hr/defect-adjustments/${id}/reverse`, {
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
    getSparePartsStock: async (): Promise<{ spare_parts: any[] }> => {
      return this.request('/maintenance/spare-parts/stock');
    },
    createSparePartStock: async (payload: any): Promise<{ message: string; item: any }> => {
      return this.request('/maintenance/spare-parts/stock', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    addSparePart: async (workOrderId: string, payload: any): Promise<{ message: string; spare_part: any }> => {
      return this.request(`/maintenance/work-orders/${workOrderId}/spare-parts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Storefront Orders & Themes (ERP side) ---
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
    getSettings: async (): Promise<any> => {
      return this.request('/storefront/settings');
    },
    updateSettings: async (data: any): Promise<any> => {
      return this.request('/storefront/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    verifyPayment: async (id: string, approved: boolean, rejection_reason?: string): Promise<{ message: string; order: any }> => {
      return this.request(`/storefront/orders/${id}/verify-payment`, {
        method: 'POST',
        body: JSON.stringify({ approved, rejection_reason }),
      });
    },
    getPendingPayments: async (page = 1): Promise<PaginatedResponse<any>> => {
      return this.request(`/storefront/payments/pending?page=${page}`);
    },
    updateInstaPaySettings: async (data: {
      instapay_identifier: string;
      instapay_display_name: string;
      instapay_enabled?: boolean;
      instapay_instructions?: string;
    }): Promise<any> => {
      return this.request('/storefront/instapay-settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    approveSubmissionPayment: async (submissionId: string, notes?: string): Promise<any> => {
      return this.request(`/storefront/payments/${submissionId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved: true, notes }),
      });
    },
    rejectSubmissionPayment: async (submissionId: string, reason: string): Promise<any> => {
      return this.request(`/storefront/payments/${submissionId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ approved: false, rejection_reason: reason }),
      });
    },
    uploadReceipt: async (formData: FormData, tenantIdOrSlug?: string): Promise<any> => {
      const endpoint = tenantIdOrSlug ? `/storefront/upload-receipt/${encodeURIComponent(tenantIdOrSlug)}` : '/storefront/upload-receipt';
      return this.request(endpoint, {
        method: 'POST',
        body: formData,
      });
    },

    // --- Batch 9: Storefront Design Studio & Self-Service Customizer ---
    getDesignStudio: async (): Promise<any> => {
      return this.request('/storefront/design');
    },
    saveDesignDraft: async (data: { theme_id?: string; theme_config?: any }): Promise<any> => {
      return this.request('/storefront/design/draft', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    publishDesign: async (): Promise<any> => {
      return this.request('/storefront/design/publish', {
        method: 'POST',
      });
    },
    rollbackDesign: async (): Promise<any> => {
      return this.request('/storefront/design/rollback', {
        method: 'POST',
      });
    },

    // Public Consumer Storefront API
    getPublicStore: async (tenantIdOrSlug?: string, preview?: boolean): Promise<any> => {
      let endpoint = tenantIdOrSlug ? `/storefront/public/${encodeURIComponent(tenantIdOrSlug)}` : '/storefront/public';
      if (preview) {
        endpoint += `${endpoint.includes('?') ? '&' : '?'}preview=1`;
      }
      return this.request(endpoint);
    },
    placePublicOrder: async (payload: any, tenantIdOrSlug?: string): Promise<{ message: string; order: any }> => {
      const endpoint = tenantIdOrSlug ? `/storefront/order/${encodeURIComponent(tenantIdOrSlug)}` : '/storefront/order';
      return this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    trackOrder: async (params: { order_number: string; customer_phone: string; tenant_id?: string }): Promise<{ order: any; store_info: any }> => {
      const query = new URLSearchParams({
        order_number: params.order_number,
        customer_phone: params.customer_phone,
      });
      const endpoint = params.tenant_id
        ? `/storefront/track/${encodeURIComponent(params.tenant_id)}?${query.toString()}`
        : `/storefront/track?${query.toString()}`;
      return this.request(endpoint);
    },
    submitReceipt: async (payload: { order_number: string; customer_phone: string; instapay_reference: string; instapay_receipt_url?: string; tenant_id?: string }): Promise<{ message: string; order: any }> => {
      const endpoint = payload.tenant_id ? `/storefront/receipt/${encodeURIComponent(payload.tenant_id)}` : '/storefront/receipt';
      return this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
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

  // --- Commercial SaaS Subscription, Metering & Quotas ---
  public subscription = {
    getPlans: async (): Promise<{ plans: any[]; meters_catalog: Record<string, any> }> => {
      return this.request('/subscription/plans');
    },
    getCurrentReport: async (): Promise<any> => {
      return this.request('/subscription/current');
    },
    upgrade: async (payload: { plan_code: string; billing_cycle?: 'monthly' | 'annual' }): Promise<{ message: string; subscription: any }> => {
      return this.request('/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getAdminSubscriptions: async (page = 1): Promise<any> => {
      return this.request(`/admin/subscriptions?page=${page}`);
    },
    grantAdminOverride: async (payload: { tenant_id: string; meter_key: string; temporary_limit: number; reason: string; days?: number }): Promise<{ message: string; override: any }> => {
      return this.request('/admin/subscriptions/override', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // --- Phase G: Waslat Worsh Integrated B2B Marketplace ---
  public waslatWorsh = {
    // Stage C.1: Public Website & Marketplace Browsing
    getPublicRfqs: async (params: { category?: string; search?: string; service_type?: string; page?: number; per_page?: number } = {}): Promise<{ data: any[]; meta: any }> => {
      const q = new URLSearchParams();
      if (params.category && params.category !== 'all') q.append('category', params.category);
      if (params.search) q.append('search', params.search);
      if (params.service_type && params.service_type !== 'all') q.append('service_type', params.service_type);
      if (params.page) q.append('page', String(params.page));
      if (params.per_page) q.append('per_page', String(params.per_page));
      return this.request(`/waslat-worsh/public/rfqs?${q.toString()}`);
    },
    getPublicRfq: async (id: string): Promise<{ rfq: any }> => {
      return this.request(`/waslat-worsh/public/rfqs/${id}`);
    },
    getPublicMetrics: async (): Promise<{ active_rfqs_count: number; total_target_pieces: number; governorates_count: number; categories_count: number; currency: string; updated_at: string }> => {
      return this.request('/waslat-worsh/public/metrics');
    },

    getEligibility: async (): Promise<any> => {
      return this.request('/waslat-worsh/eligibility');
    },
    getWorkshops: async (params: { specialty_type?: string; governorate?: string; search?: string; page?: number } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.specialty_type) q.append('specialty_type', params.specialty_type);
      if (params.governorate) q.append('governorate', params.governorate);
      if (params.search) q.append('search', params.search);
      if (params.page) q.append('page', String(params.page));
      return this.request(`/waslat-worsh/workshops?${q.toString()}`);
    },
    createWorkshop: async (payload: any): Promise<{ message: string; workshop: any }> => {
      return this.request('/waslat-worsh/workshops', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getRfqs: async (params: { status?: string; service_type?: string; search?: string; page?: number; my_history?: number | boolean } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.status) q.append('status', params.status);
      if (params.service_type) q.append('service_type', params.service_type);
      if (params.search) q.append('search', params.search);
      if (params.page) q.append('page', String(params.page));
      if (params.my_history) q.append('my_history', '1');
      return this.request(`/waslat-worsh/rfqs?${q.toString()}`);
    },
    createRfq: async (payload: any): Promise<{ message: string; rfq: any }> => {
      return this.request('/waslat-worsh/rfqs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateRfq: async (id: string, payload: any): Promise<{ message: string; rfq: any }> => {
      return this.request(`/waslat-worsh/rfqs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    publishRfq: async (id: string, payload: { accept_terms?: boolean } = {}): Promise<{ message: string; rfq: any }> => {
      return this.request(`/waslat-worsh/rfqs/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    cancelRfq: async (id: string, reason?: string): Promise<{ message: string; rfq: any }> => {
      return this.request(`/waslat-worsh/rfqs/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    uploadAttachment: async (id: string, file: File, fileType: string = 'tech_spec'): Promise<{ message: string; attachment: any }> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', fileType);
      return this.request(`/waslat-worsh/rfqs/${id}/attachments`, {
        method: 'POST',
        body: formData,
      });
    },
    deleteAttachment: async (id: string, attachmentId: string): Promise<{ message: string; rfq: any }> => {
      return this.request(`/waslat-worsh/rfqs/${id}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
    },
    getRfq: async (id: string): Promise<any> => {
      return this.request(`/waslat-worsh/rfqs/${id}`);
    },
    submitBid: async (rfqId: string, payload: { workshop_profile_id: string; unit_rate: number; promised_lead_days: number; notes?: string }): Promise<{ message: string; bid: any }> => {
      return this.request(`/waslat-worsh/rfqs/${rfqId}/bids`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    acceptBid: async (rfqId: string, bidId: string): Promise<{ message: string; result: any }> => {
      return this.request(`/waslat-worsh/rfqs/${rfqId}/bids/${bidId}/accept`, {
        method: 'POST',
      });
    },
    submitReview: async (payload: any): Promise<{ message: string; review: any }> => {
      return this.request('/waslat-worsh/reviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    // Stage C.3 & C.4: باقات اشتراك وصلة ورش وتقديم إثباتات السداد وحالة الحصص
    getSubscriptionPlans: async (): Promise<{ plans: any[]; payment_instructions: any }> => {
      return this.request('/waslat-worsh/subscription-plans');
    },
    submitPaymentRequest: async (formData: FormData): Promise<{ message: string; payment_request: any }> => {
      return this.request('/subscriptions/payment-requests', {
        method: 'POST',
        body: formData,
      });
    },
    getMyLatestPaymentRequest: async (): Promise<{ latest_payment_request: any }> => {
      return this.request('/subscriptions/payment-requests/my-latest');
    },
    getMySubscriptionStatus: async (): Promise<any> => {
      return this.request('/subscriptions/my-status');
    },
    // P4: Factory Cutting Workspace Operations & Bids
    getMyBids: async (): Promise<{ bids: any[]; total: number }> => {
      return this.request('/waslat-worsh/my-bids');
    },
    withdrawBid: async (id: string): Promise<{ message: string }> => {
      return this.request(`/waslat-worsh/bids/${id}/withdraw`, {
        method: 'POST',
      });
    },
    getMyOperations: async (): Promise<{ operations: any[]; total: number }> => {
      return this.request('/waslat-worsh/my-operations');
    },
    updateOperationStatus: async (id: string, status: string, notes?: string): Promise<{ message: string; operation: any }> => {
      return this.request(`/waslat-worsh/rfqs/${id}/operation-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      });
    },
  };

  // --- Stage C.4 & P2: لوحة المشرف العام لمراجعة واعتماد طلبات السداد وإدارة الباقات ---
  public adminSubscriptions = {
    getRequests: async (params: { status?: string; product_type?: string; page?: number; per_page?: number } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.status) q.append('status', params.status);
      if (params.product_type) q.append('product_type', params.product_type);
      if (params.page) q.append('page', String(params.page));
      if (params.per_page) q.append('per_page', String(params.per_page));
      return this.request(`/platform-admin/subscription-requests?${q.toString()}`);
    },
    approve: async (id: string): Promise<{ message: string; payment_request: any }> => {
      return this.request(`/platform-admin/subscription-requests/${id}/approve`, {
        method: 'POST',
      });
    },
    reject: async (id: string, reason: string): Promise<{ message: string; payment_request: any }> => {
      return this.request(`/platform-admin/subscription-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: reason }),
      });
    },
    getReceiptBlobUrl: async (id: string): Promise<string> => {
      const token = this.token;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${this.baseUrl}/platform-admin/subscription-requests/${id}/receipt`, {
        headers,
      });
      if (!res.ok) {
        throw new Error('فشل تحميل ملف الإيصال');
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
    // P2: Platform Admin Waslat Worsh Packages Management
    getPackages: async (params?: { is_active?: boolean }): Promise<{ packages: any[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.is_active !== undefined) q.append('is_active', String(params.is_active));
      return this.request(`/platform-admin/packages?${q.toString()}`);
    },
    createPackage: async (data: any): Promise<{ message: string; package: any }> => {
      return this.request('/platform-admin/packages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updatePackage: async (id: string, data: any): Promise<{ message: string; package: any }> => {
      return this.request(`/platform-admin/packages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    togglePackageActive: async (id: string): Promise<{ message: string; package: any }> => {
      return this.request(`/platform-admin/packages/${id}/toggle-active`, {
        method: 'PATCH',
      });
    },
  };

  // Unified SaaS Package, Feature & Entitlement Management
  saas = {
    getPackages: async (params?: { category?: string; is_active?: boolean; is_public?: boolean; is_archived?: boolean }): Promise<{ packages: any[]; total: number; erp_count: number; waslat_count: number }> => {
      const q = new URLSearchParams();
      if (params?.category) q.append('category', params.category);
      if (params?.is_active !== undefined) q.append('is_active', String(params.is_active));
      if (params?.is_public !== undefined) q.append('is_public', String(params.is_public));
      if (params?.is_archived !== undefined) q.append('is_archived', String(params.is_archived));
      return this.request(`/platform-admin/saas/packages?${q.toString()}`);
    },
    createPackage: async (data: any): Promise<{ message: string; package: any }> => {
      return this.request('/platform-admin/saas/packages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updatePackage: async (id: string, data: any): Promise<{ message: string; package: any }> => {
      return this.request(`/platform-admin/saas/packages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    duplicatePackage: async (id: string): Promise<{ message: string; package: any }> => {
      return this.request(`/platform-admin/saas/packages/${id}/duplicate`, {
        method: 'POST',
      });
    },
    togglePackageActive: async (id: string): Promise<{ message: string; is_active: boolean }> => {
      return this.request(`/platform-admin/saas/packages/${id}/toggle-active`, {
        method: 'PATCH',
      });
    },
    togglePackagePublic: async (id: string): Promise<{ message: string; is_public: boolean }> => {
      return this.request(`/platform-admin/saas/packages/${id}/toggle-public`, {
        method: 'PATCH',
      });
    },
    archivePackage: async (id: string): Promise<{ message: string; package: any }> => {
      return this.request(`/platform-admin/saas/packages/${id}/archive`, {
        method: 'POST',
      });
    },
    getPackageSubscribers: async (id: string): Promise<{ package: any; subscribers_count: number; subscribers: any[] }> => {
      return this.request(`/platform-admin/saas/packages/${id}/subscribers`);
    },
    getFeatures: async (params?: { category?: string }): Promise<{ features: any[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.category) q.append('category', params.category);
      return this.request(`/platform-admin/saas/features?${q.toString()}`);
    },
    createFeature: async (data: any): Promise<{ message: string; feature: any }> => {
      return this.request('/platform-admin/saas/features', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateFeature: async (id: string, data: any): Promise<{ message: string; feature: any }> => {
      return this.request(`/platform-admin/saas/features/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    toggleFeatureActive: async (id: string): Promise<{ message: string; is_active: boolean }> => {
      return this.request(`/platform-admin/saas/features/${id}/toggle-active`, {
        method: 'PATCH',
      });
    },
    toggleFeaturePublic: async (id: string): Promise<{ message: string; is_public: boolean }> => {
      return this.request(`/platform-admin/saas/features/${id}/toggle-public`, {
        method: 'PATCH',
      });
    },
    getMetrics: async (): Promise<{
      overview: { total_tenants: number; erp_tenants: number; requester_tenants: number; active_subscriptions: number };
      packages: { erp_active_packages: number; waslat_active_packages: number; archived_packages: number };
      features: { total_features: number; active_features: number };
      financials: { total_gross_payments: number; pending_requests_count: number; pending_requests_amount: number };
    }> => {
      return this.request('/platform-admin/saas/metrics');
    },
    getPublicPlans: async (category: 'erp' | 'waslat_worsh'): Promise<{
      category: string;
      plans: any[];
      features_catalog: any[];
      payment_instructions: any;
    }> => {
      return this.request(`/subscription/public-plans?category=${category}`);
    },
  };
}

export const api = new ApiClient();
