<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreatePlatformAdmin extends Command
{
    protected $signature = 'platform:create-admin 
                            {--email= : Email address of the platform admin}
                            {--name= : Full name of the platform admin}
                            {--password= : Optional password (prompted if omitted)}';

    protected $description = 'Provision a secure GarmentOS Cloud platform administrator account';

    public function handle(): int
    {
        $this->info('=== GarmentOS Cloud — Platform Admin Provisioning ===');

        $email = $this->option('email') ?: $this->ask('Enter admin email address');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email format.');
            return 1;
        }

        if (User::withoutGlobalScopes()->where('email', $email)->exists()) {
            $this->error("User with email [{$email}] already exists.");
            return 1;
        }

        $name = $this->option('name') ?: $this->ask('Enter admin full name', 'مدير عام المنصة');
        $password = $this->option('password') ?: $this->secret('Enter admin password (min 8 chars)');

        if (strlen($password) < 8) {
            $this->error('Password must be at least 8 characters long.');
            return 1;
        }

        // إنشاء أو جلب شركة النظام الإدارية الرئيسية المعزولة (Platform Host Tenant)
        $hostTenant = Tenant::withoutGlobalScopes()->firstOrCreate(
            ['code' => 'PLATFORM-ROOT'],
            [
                'name' => 'GarmentOS Cloud Platform Operations',
                'subdomain' => 'platform-root',
                'status' => 'active',
                'plan_tier' => 'enterprise',
                'currency' => 'EGP',
                'timezone' => 'Africa/Cairo',
            ]
        );

        $admin = User::withoutGlobalScopes()->create([
            'tenant_id' => $hostTenant->id,
            'name' => $name,
            'email' => $email,
            'role' => 'platform_admin',
            'is_active' => true,
            'password' => Hash::make($password),
        ]);

        $this->info("Successfully provisioned platform admin [{$admin->email}] (ID: {$admin->id}).");
        return 0;
    }
}
