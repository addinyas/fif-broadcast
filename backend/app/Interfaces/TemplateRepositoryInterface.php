<?php

namespace App\Interfaces;

interface TemplateRepositoryInterface
{
    public function getAll($user = null);

    public function findById(int $id, $user = null);

    public function create(array $data);

    public function update(int $id, array $data, $user = null);

    public function delete(int $id, $user = null): void;
}
