<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'phone',
        'role',
        'is_active',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (User $user) {
            if ($user->isDirty('role') && $user->role === 'platform_admin') {
                $authUser = auth()->user();
                if ($authUser) {
                    $originalRole = $authUser->getOriginal('role') ?? $authUser->role;
                    if ($originalRole !== 'platform_admin') {
                        throw new \Illuminate\Auth\Access\AuthorizationException('أمان: محاولة غير مصرح بها لترقية الحساب إلى مشرف منصة عام (PlatformAdminEscalationBlocked).');
                    }
                } elseif (!app()->runningInConsole()) {
                    throw new \Illuminate\Auth\Access\AuthorizationException('أمان: لا يمكن إنشاء مشرف منصة عام دون مصادقة إدارية معتمدة.');
                }
            }
        });
    }
}
