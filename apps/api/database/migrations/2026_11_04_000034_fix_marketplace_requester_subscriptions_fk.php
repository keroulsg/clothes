<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * إصلاح القيد المرجعي لجدول marketplace_requester_subscriptions
     * لمنع خطأ SQLite: no such table: main.id
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');

            // إذا كان هناك جدول قديم متبقي من محاولة سابقة
            if (Schema::hasTable('marketplace_requester_subscriptions_old')) {
                if (Schema::hasTable('marketplace_requester_subscriptions')) {
                    $countOld = DB::table('marketplace_requester_subscriptions_old')->count();
                    $countNew = DB::table('marketplace_requester_subscriptions')->count();
                    if ($countOld > 0 && $countNew === 0) {
                        $columns = ['id', 'tenant_id', 'plan_id', 'plan_code', 'payment_request_id', 'status', 'allowed_rfq_count', 'consumed_rfq_count', 'starts_at', 'expires_at', 'approved_by', 'approved_at', 'created_at', 'updated_at'];
                        $colsList = implode(', ', $columns);
                        DB::statement("INSERT OR IGNORE INTO marketplace_requester_subscriptions ({$colsList}) SELECT {$colsList} FROM marketplace_requester_subscriptions_old;");
                    }
                }
                Schema::dropIfExists('marketplace_requester_subscriptions_old');
            } else if (Schema::hasTable('marketplace_requester_subscriptions')) {
                // فحص ما إذا كان القيد المعطوب موجوداً في تعريف الجدول
                $tableSql = DB::select("SELECT sql FROM sqlite_master WHERE name = 'marketplace_requester_subscriptions'")[0]->sql ?? '';
                if (str_contains($tableSql, 'references "id"("subscription_payment_requests")')) {
                    DB::statement('DROP INDEX IF EXISTS mkt_req_sub_tenant_status_idx;');
                    DB::statement('ALTER TABLE marketplace_requester_subscriptions RENAME TO marketplace_requester_subscriptions_old;');

                    Schema::create('marketplace_requester_subscriptions', function (Blueprint $table) {
                        $table->uuid('id')->primary();
                        $table->uuid('tenant_id')->index();
                        $table->uuid('plan_id')->nullable()->index();
                        $table->string('plan_code', 50);
                        $table->uuid('payment_request_id')->nullable()->index();
                        $table->string('status', 32)->default('pending_approval');
                        $table->integer('allowed_rfq_count')->default(5);
                        $table->integer('consumed_rfq_count')->default(0);
                        $table->timestamp('starts_at')->nullable();
                        $table->timestamp('expires_at')->nullable();
                        $table->unsignedBigInteger('approved_by')->nullable()->index();
                        $table->timestamp('approved_at')->nullable();
                        $table->timestamps();

                        $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                        $table->foreign('plan_id')->references('id')->on('subscription_plans')->onDelete('set null');
                        $table->foreign('payment_request_id')->references('id')->on('subscription_payment_requests')->onDelete('set null');
                        $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
                    });

                    $columns = ['id', 'tenant_id', 'plan_id', 'plan_code', 'payment_request_id', 'status', 'allowed_rfq_count', 'consumed_rfq_count', 'starts_at', 'expires_at', 'approved_by', 'approved_at', 'created_at', 'updated_at'];
                    $colsList = implode(', ', $columns);
                    DB::statement("INSERT INTO marketplace_requester_subscriptions ({$colsList}) SELECT {$colsList} FROM marketplace_requester_subscriptions_old;");
                    Schema::dropIfExists('marketplace_requester_subscriptions_old');
                }
            }

            // التأكد من وجود الفهرس إن لم يكن موجوداً
            try {
                DB::statement('CREATE INDEX IF NOT EXISTS mkt_req_sub_tenant_status_idx ON marketplace_requester_subscriptions (tenant_id, status);');
            } catch (\Throwable $e) {
                // ignore
            }

            DB::statement('PRAGMA foreign_keys = ON;');
        } else {
            // لقواعد البيانات الأخرى (PostgreSQL / MySQL)
            if (Schema::hasTable('marketplace_requester_subscriptions')) {
                Schema::table('marketplace_requester_subscriptions', function (Blueprint $table) {
                    try {
                        $table->dropForeign(['payment_request_id']);
                    } catch (\Throwable $e) {
                        // ignore
                    }
                    $table->foreign('payment_request_id')->references('id')->on('subscription_payment_requests')->onDelete('set null');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op to preserve fixed structure
    }
};
