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
            $query->where('created_by', $user->id);
        }

        return $query->latest()->get();
    }

    public function findById(int $id, $user = null)
    {
        $query = Template::with('creator:id,name')->where('id', $id);
        if ($user && $user->role === 'marketing') {
            $query->where('created_by', $user->id);
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
        if ($user && $user->role === 'marketing') {
            $query->where('created_by', $user->id);
        }
        $template = $query->findOrFail($id);
        $template->update($data);

        return $template->fresh();
    }

    public function delete(int $id, $user = null): void
    {
        $query = Template::where('id', $id);
        if ($user && $user->role === 'marketing') {
            $query->where('created_by', $user->id);
        }
        $query->findOrFail($id)->delete();
    }
}
