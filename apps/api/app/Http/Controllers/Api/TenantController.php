<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantController extends Controller
{
    /**
     * تسجيل شركة/مصنع جديد بالكامل وإنشاء الحساب الرئيسي والفرع الافتراضي
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'subdomain' => 'nullable|string|alpha_dash|max:50|unique:tenants,subdomain',
            'owner_name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:30',
            'plan_tier' => 'nullable|string|in:starter,professional,enterprise',
        ]);

        return DB::transaction(function () use ($validated) {
            $tenantCode = 'MFG-' . strtoupper(Str::random(6));

            $tenant = Tenant::create([
                'code' => $tenantCode,
                'name' => $validated['company_name'],
                'subdomain' => $validated['subdomain'] ?? strtolower(Str::slug($validated['company_name'])) . '-' . rand(100, 999),
                'status' => 'active',
                'plan_tier' => $validated['plan_tier'] ?? 'professional',
                'currency' => 'EGP',
                'timezone' => 'Africa/Cairo',
                'settings' => [
                    'fiscal_year_start' => '01-01',
                    'default_cutting_waste_tolerance_pct' => 3.5,
                    'piece_rate_approval_required' => true,
                ],
            ]);

            // إنشاء الفرع والمصنع الرئيسي
            $branch = Branch::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'name' => 'المصنع الرئيسي',
                'code' => 'HQ-01',
                'type' => 'factory',
                'is_main' => true,
                'phone' => $validated['phone'] ?? null,
            ]);

            // إنشاء حساب مالك الشركة
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['owner_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => 'company_owner',
                'is_active' => true,
                'password' => Hash::make($validated['password']),
            ]);

            return response()->json([
                'message' => 'تم إنشاء حساب المصنع والشركة بنجاح.',
                'tenant' => [
                    'id' => $tenant->id,
                    'code' => $tenant->code,
                    'name' => $tenant->name,
                    'subdomain' => $tenant->subdomain,
                    'plan_tier' => $tenant->plan_tier,
                ],
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'main_branch' => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                ],
            ], 201);
        });
    }

    /**
     * ملف الشركة والمؤشرات الأساسية
     */
    public function current(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::withCount(['users', 'branches'])->findOrFail($tenantId);

        return response()->json([
            'tenant' => $tenant,
        ]);
    }
}
