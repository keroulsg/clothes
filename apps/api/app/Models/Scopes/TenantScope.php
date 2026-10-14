<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * تطبيق الـ Scope لتقييد أي استعلام بهوية المستأجر الحالي فقط.
     * الأمان الحرج: غياب هوية الشركة يمنع إرجاع أي سجلات نهائياً لمنع الاستعلام غير المقيد عبر الشركات (Fail-Closed).
     */
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        if (!empty($tenantId)) {
            $builder->where($model->getTable() . '.tenant_id', '=', $tenantId);
        } else {
            // أمان حرج: غياب هوية الشركة يمنع إرجاع أي سجلات نهائياً (Fail-Closed)
            $builder->whereRaw('1 = 0');
        }
    }
}
