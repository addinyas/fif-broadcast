<?php

namespace App\Services;

use App\Models\RolePermission;

class PermissionService
{
    public function getAll(): array
    {
        $permissions = RolePermission::orderBy('role')->orderBy('feature')->get();
        $grouped = [];
        foreach ($permissions as $p) {
            $grouped[$p->role][] = [
                'id' => $p->id,
                'feature' => $p->feature,
                'enabled' => $p->enabled,
            ];
        }

        return $grouped;
    }

    public function update(int $id, bool $enabled): RolePermission
    {
        $perm = RolePermission::findOrFail($id);
        $perm->update(['enabled' => $enabled]);

        return $perm;
    }

    public function updateBulk(array $permissions): void
    {
        foreach ($permissions as $item) {
            if (isset($item['id'])) {
                RolePermission::where('id', $item['id'])->update(['enabled' => (bool) $item['enabled']]);
            }
        }
    }

    public function roleHasFeature(string $role, string $feature): bool
    {
        if ($role === 'superadmin') {
            return true;
        }

        $perm = RolePermission::where('role', $role)->where('feature', $feature)->first();

        return $perm ? $perm->enabled : false;
    }
}
