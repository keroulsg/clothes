<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Services\StorefrontService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StorefrontConfigurableShippingTest extends TestCase
{
    use RefreshDatabase;

    protected StorefrontService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(StorefrontService::class);
    }

    public function test_standard_fallback_free_shipping_for_subtotal_over_1500(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-SHIP-01',
            'name' => 'Shipping Factory 01',
        ]);

        $shipping = $this->service->calculateAuthoritativeShipping($tenant->id, 'Cairo', 1500.0);
        $this->assertEquals(0.0, $shipping);

        $shipping = $this->service->calculateAuthoritativeShipping($tenant->id, 'Alexandria', 2000.0);
        $this->assertEquals(0.0, $shipping);
    }

    public function test_standard_fallback_rates_by_egyptian_governorate(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-SHIP-02',
            'name' => 'Shipping Factory 02',
        ]);

        // Cairo / Giza
        $this->assertEquals(50.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'cairo', 500.0));
        $this->assertEquals(50.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'القاهرة', 500.0));
        $this->assertEquals(50.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'giza', 500.0));

        // Alexandria / Delta / Canal
        $this->assertEquals(60.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'alexandria', 500.0));
        $this->assertEquals(60.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'الإسكندرية', 500.0));
        $this->assertEquals(60.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'tanta', 500.0));
        $this->assertEquals(60.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'ismailia', 500.0));

        // Upper Egypt / Red Sea
        $this->assertEquals(80.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'aswan', 500.0));
        $this->assertEquals(80.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'luxor', 500.0));
        $this->assertEquals(80.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'hurghada', 500.0));
    }

    public function test_custom_tenant_shipping_configuration(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-SHIP-03',
            'name' => 'Shipping Factory 03',
        ]);

        TenantStoreSetting::create([
            'tenant_id' => $tenant->id,
            'store_name' => 'Custom Shipping Store',
            'theme_id' => 'fashion_boutique',
            'theme_config' => [
                'shipping' => [
                    'free_shipping_threshold' => 800.0,
                    'flat_rate' => 40.0,
                    'zones' => [
                        [
                            'name' => 'Delta Zone',
                            'cities' => ['tanta', 'mansoura'],
                            'rate' => 35.0,
                        ],
                    ],
                ],
            ],
            'is_store_enabled' => true,
        ]);

        // Custom free shipping threshold (800 EGP)
        $this->assertEquals(0.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'tanta', 850.0));

        // Custom zone rate (35 EGP for Tanta)
        $this->assertEquals(35.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'tanta', 300.0));

        // Custom flat rate fallback (40 EGP for unlisted city)
        $this->assertEquals(40.0, $this->service->calculateAuthoritativeShipping($tenant->id, 'unlisted_city', 300.0));
    }
}
