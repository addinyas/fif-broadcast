<?php

namespace App\Services;

use App\Interfaces\TemplateRepositoryInterface;

class TemplateService
{
    public function __construct(
        protected TemplateRepositoryInterface $templateRepository
    ) {}

    public function getAll($user = null)
    {
        return $this->templateRepository->getAll($user);
    }

    public function findById(int $id, $user = null)
    {
        return $this->templateRepository->findById($id, $user);
    }

    public function create(array $data)
    {
        return $this->templateRepository->create($data);
    }

    public function update(int $id, array $data, $user = null)
    {
        return $this->templateRepository->update($id, $data, $user);
    }

    public function delete(int $id, $user = null): void
    {
        $this->templateRepository->delete($id, $user);
    }
}
