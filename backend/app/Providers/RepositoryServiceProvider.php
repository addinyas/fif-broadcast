<?php

namespace App\Providers;

use App\Interfaces\BroadcastRepositoryInterface;
use App\Interfaces\CustomerRepositoryInterface;
use App\Interfaces\TemplateRepositoryInterface;
use App\Repositories\BroadcastRepository;
use App\Repositories\CustomerRepository;
use App\Repositories\TemplateRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(CustomerRepositoryInterface::class, CustomerRepository::class);
        $this->app->bind(TemplateRepositoryInterface::class, TemplateRepository::class);
        $this->app->bind(BroadcastRepositoryInterface::class, BroadcastRepository::class);
    }

    public function boot(): void
    {
        //
    }
}
