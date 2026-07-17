<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'display_name',
        'phone_number',
        'email',
        'password',
        'avatar',
        'role',
        'gender',
        'npo_mce_id',
        'kios_name',
        'kios_id',
        'fcm_token',
        'wa_proxy',
    ];

    protected $appends = [
        'avatar_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar ? url('storage/'.$this->avatar) : null;
    }

    public function uploadedCustomers(): HasMany
    {
        return $this->hasMany(Customer::class, 'uploaded_by');
    }

    public function assignedCustomers(): HasMany
    {
        return $this->hasMany(Customer::class, 'marketing_id');
    }

    public function templates(): HasMany
    {
        return $this->hasMany(Template::class, 'created_by');
    }

    public function broadcastHistories(): HasMany
    {
        return $this->hasMany(BroadcastHistory::class, 'marketing_id');
    }

    public function whatsappConnection(): HasOne
    {
        return $this->hasOne(WhatsappConnection::class);
    }
}
