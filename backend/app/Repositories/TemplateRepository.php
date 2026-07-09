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

    public function findById(int $id)
    {
        return Template::with('creator:id,name')->findOrFail($id);
    }

    public function create(array $data)
    {
        return Template::create($data);
    }

    public function update(int $id, array $data)
    {
        $template = Template::findOrFail($id);
        $template->update($data);

        return $template->fresh();
    }

    public function delete(int $id): void
    {
        Template::findOrFail($id)->delete();
    }
}
