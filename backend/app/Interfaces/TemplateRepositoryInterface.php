<?php

namespace App\Interfaces;

interface TemplateRepositoryInterface
{
    public function getAll($user = null);

    public function findById(int $id);

    public function create(array $data);

    public function update(int $id, array $data);

    public function delete(int $id): void;
}
