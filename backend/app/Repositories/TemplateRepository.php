<?php

namespace App\Repositories;

use App\Interfaces\TemplateRepositoryInterface;
use App\Models\Template;

class TemplateRepository implements TemplateRepositoryInterface
{
    public function getAll($user = null)
    {
        $query = Template::with('creator:id,name');
        if ($user && $user->role === 'marketing') {
            $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                    ->orWhere('is_default', true);
            });
        }

        return $query->latest()->get();
    }

    public function findById(int $id, $user = null)
    {
        $query = Template::with('creator:id,name')->where('id', $id);
        if ($user && $user->role === 'marketing') {
            $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                    ->orWhere('is_default', true);
            });
        }

        return $query->findOrFail($id);
    }

    public function create(array $data)
    {
        return Template::create($data);
    }

    public function update(int $id, array $data, $user = null)
    {
        $query = Template::where('id', $id);

        $template = $query->findOrFail($id);

        if ($template->is_default && (! $user || $user->role !== 'superadmin')) {
            abort(403, 'Template default hanya bisa diubah oleh superadmin.');
        }

        if ($user && $user->role === 'marketing' && ! $template->is_default) {
            $query->where('created_by', $user->id);
            $template = $query->findOrFail($id);
        }

        $template->update($data);

        return $template->fresh();
    }

    public function delete(int $id, $user = null): void
    {
        $template = Template::findOrFail($id);

        if ($template->is_default && (! $user || $user->role !== 'superadmin')) {
            abort(403, 'Template default hanya bisa dihapus oleh superadmin.');
        }

        if ($user && $user->role === 'marketing' && ! $template->is_default) {
            $query = Template::where('id', $id)->where('created_by', $user->id);
            $query->findOrFail($id)->delete();

            return;
        }

        $template->delete();
    }
}
