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

    public function findById(int $id)
    {
        return $this->templateRepository->findById($id);
    }

    public function create(array $data)
    {
        return $this->templateRepository->create($data);
    }

    public function update(int $id, array $data)
    {
        return $this->templateRepository->update($id, $data);
    }

    public function delete(int $id): void
    {
        $this->templateRepository->delete($id);
    }
}
