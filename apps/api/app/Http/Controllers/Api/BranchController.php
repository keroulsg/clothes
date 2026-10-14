<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    /**
     * عرض فروع الشركة المعزولة تلقائيًا
     */
    public function index(): JsonResponse
    {
        $branches = Branch::orderBy('is_main', 'desc')->get();

        return response()->json([
            'branches' => $branches,
        ]);
    }

    /**
     * إنشاء فرع جديد للمصنع (مخزن، صالة عرض، منفذ بيع)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'type' => 'required|string|in:factory,outlet,warehouse,head_office',
            'is_main' => 'boolean',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:50',
        ]);

        $branch = Branch::create($validated);

        return response()->json([
            'message' => 'تم إنشاء الفرع بنجاح.',
            'branch' => $branch,
        ], 201);
    }

    /**
     * عرض تفاصيل فرع محدد مع ضمان عدم الوصول لفرع شركة أخرى
     */
    public function show(string $id): JsonResponse
    {
        // سيفشل تلقائيًا ويعطي 404 إذا كان المعرف ينتمي لمستأجر آخر بسبب TenantScope
        $branch = Branch::findOrFail($id);

        return response()->json([
            'branch' => $branch,
        ]);
    }
}
