<?php

namespace Tests\Feature;

use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Tenant;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Concurrency & Idempotency Integration Test
 *
 * NOTE ON DATABASE CONCURRENCY MECHANICS:
 * SQLite in-memory uses coarse-grained/table-level database locking during write transactions.
 * While SQLite verifies logical correctness, transaction rollback behavior, and unique constraint
 * collision handling, it does NOT provide multi-connection row-level locking.
 * In production PostgreSQL, SELECT ... FOR UPDATE issues true row-level locks on inventory_items,
 * purchase_orders, and suppliers, and unique composite indexes (tenant_id, idempotency_key)
 * enforce atomic concurrency at the database engine level.
 */
class ConcurrencyIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Warehouse $warehouse;
    private InventoryItem $item;
    private InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'code' => 'TEN-CONCURRENCY-01',
            'name' => 'مصنع التزامن والنزاهة',
            'subdomain' => 'concurrency-mill',
            'status' => 'active',
        ]);

        $this->warehouse = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مخزن النزاهة المركزي',
            'code' => 'WH-CONC-01',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        $this->item = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'item_type' => 'fabric_raw',
            'code' => 'ITEM-CONC-001',
            'name' => 'نسيج التزامن عالي المتانة',
            'unit_of_measure' => 'm',
            'current_balance' => 100.0,
            'average_cost' => 50.0,
        ]);

        $this->inventoryService = app(InventoryService::class);
        app()->instance('current_tenant_id', $this->tenant->id);
    }

    /**
     * التحقق من أن تراجع المعاملة عند حدوث تصادم تفرد يلغي تماماً أي تعديل على رصيد المخزن
     */
    public function test_concurrent_idempotency_collision_rolls_back_stock_balance_completely(): void
    {
        $idempKey = 'RACE-COLLISION-' . uniqid();

        // 1. تسجيل الحركة الأولى الفائزة
        $first = $this->inventoryService->recordTransaction([
            'tenant_id' => $this->tenant->id,
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'adjustment_positive',
            'direction' => 'IN',
            'quantity' => 20.0,
            'unit_cost' => 50.0,
            'reference_type' => 'manual',
            'reference_number' => 'REF-001',
            'idempotency_key' => $idempKey,
        ]);

        $this->assertEquals(120.0, (float)$this->item->fresh()->current_balance);

        // 2. محاكاة طلب ثان متزامن يحمل نفس المفتاح ولكن بمعاملات مختلفة
        // يجب أن يكتشف التعارض، ويتراجع بالكامل عن أي زيادة في الرصيد، ويعيد رمي InvalidArgumentException
        $exceptionThrown = false;
        try {
            $this->inventoryService->recordTransaction([
                'tenant_id' => $this->tenant->id,
                'inventory_item_id' => $this->item->id,
                'transaction_type' => 'adjustment_positive',
                'direction' => 'IN',
                'quantity' => 50.0, // كمية متضاربة!
                'unit_cost' => 50.0,
                'reference_type' => 'manual',
                'reference_number' => 'REF-001',
                'idempotency_key' => $idempKey,
            ]);
        } catch (\InvalidArgumentException $e) {
            $exceptionThrown = true;
            $this->assertStringContainsString('تعارض Idempotency', $e->getMessage());
        }

        $this->assertTrue($exceptionThrown, 'يجب رفض الطلب المتضارب في مفتاح عدم التكرار');
        // التأكد القاطع من أن الرصيد لم يتأثر مطلقاً وبقي 120 (وليس 170)
        $this->assertEquals(120.0, (float)$this->item->fresh()->current_balance);
        $this->assertEquals(1, InventoryTransaction::where('tenant_id', $this->tenant->id)->where('idempotency_key', $idempKey)->count());
    }
}
