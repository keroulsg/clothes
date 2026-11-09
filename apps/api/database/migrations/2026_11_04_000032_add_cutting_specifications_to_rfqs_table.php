<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('rfqs', function (Blueprint $table) {
            $table->string('model_name')->nullable()->after('title');
            $table->uuid('garment_model_id')->nullable()->after('model_name')->index();
            $table->string('garment_category', 64)->nullable()->after('garment_model_id');
            $table->string('priority', 32)->default('normal')->after('service_type'); // low, normal, urgent
            $table->json('fabric_details')->nullable()->after('fabric_responsibility');
            $table->json('production_details')->nullable()->after('fabric_details');
            $table->json('logistics')->nullable()->after('production_details');
            $table->json('attachments')->nullable()->after('logistics');
            $table->timestamp('published_at')->nullable()->after('status');
            $table->timestamp('terms_accepted_at')->nullable()->after('published_at');
            $table->string('terms_version', 32)->nullable()->after('terms_accepted_at');

            $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rfqs', function (Blueprint $table) {
            $table->dropForeign(['garment_model_id']);
            $table->dropColumn([
                'model_name',
                'garment_model_id',
                'garment_category',
                'priority',
                'fabric_details',
                'production_details',
                'logistics',
                'attachments',
                'published_at',
                'terms_accepted_at',
                'terms_version',
            ]);
        });
    }
};

