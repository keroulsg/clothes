<?php

use App\Models\SubscriptionPlan;
use App\Services\SubscriptionUsageService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. تحديث باقة Enterprise بإضافة ميزة waslat_worsh_marketplace حصرياً
        $enterprisePlan = SubscriptionPlan::where('code', 'enterprise')->first();
        if ($enterprisePlan) {
            $features = is_array($enterprisePlan->features) ? $enterprisePlan->features : [];
            if (!in_array('waslat_worsh_marketplace', $features, true)) {
                $features[] = 'waslat_worsh_marketplace';
            }
            $enterprisePlan->features = array_values(array_unique($features));
            $enterprisePlan->save();
        }

        // 2. ضمان حظر الميزة وتجريدها تماماً من باقات Starter و Pro
        $lowerPlans = SubscriptionPlan::whereIn('code', ['starter', 'pro'])->get();
        foreach ($lowerPlans as $plan) {
            $features = is_array($plan->features) ? $plan->features : [];
            $plan->features = array_values(array_diff($features, ['waslat_worsh_marketplace']));
            $plan->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $enterprisePlan = SubscriptionPlan::where('code', 'enterprise')->first();
        if ($enterprisePlan) {
            $features = is_array($enterprisePlan->features) ? $enterprisePlan->features : [];
            $enterprisePlan->features = array_values(array_diff($features, ['waslat_worsh_marketplace']));
            $enterprisePlan->save();
        }
    }
};
