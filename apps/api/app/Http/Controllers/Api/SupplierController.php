<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * عرض قائمة الموردين مع البحث والأرصدة
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('tax_id', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->orderBy('name')->paginate($request->input('per_page', 20));

        return response()->json($suppliers);
    }

    /**
     * تسجيل مورد خامات جديد
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'tax_id' => 'nullable|string|max:100',
            'payment_terms' => 'required|string|in:cash,net_15,net_30,net_60',
            'credit_limit' => 'nullable|numeric|min:0',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'message' => 'تم تسجيل المورد بنجاح.',
            'supplier' => $supplier,
        ], 201);
    }

    /**
     * تفاصيل المورد وكشف حساب المعاملات
     */
    public function show(string $id): JsonResponse
    {
        $supplier = Supplier::with(['purchaseOrders', 'invoices', 'returns'])->findOrFail($id);

        return response()->json([
            'supplier' => $supplier,
        ]);
    }
}
