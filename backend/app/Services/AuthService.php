<?php

namespace App\Services;

use App\Models\Kios;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function register(array $data): array
    {
        $kios = Kios::where('kios_id', $data['kios_id'])->firstOrFail();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'password' => $data['password'],
            'gender' => $data['gender'],
            'npo_mce_id' => $data['npo_mce_id'],
            'kios_name' => $kios->kios_name,
            'kios_id' => $kios->kios_id,
            'role' => 'marketing',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }

    public function login(array $credentials): array
    {
        $user = User::where('npo_mce_id', $credentials['npo_mce_id'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw new Exception('ID NPO MCE atau password salah', 401);
        }

        Auth::login($user);
        $token = $user->createToken('auth-token')->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    public function getProfile(User $user): User
    {
        return $user;
    }

    public function getMarketingUsers(?string $kiosId = null)
    {
        $query = User::where('role', 'marketing')
            ->select('id', 'name', 'email')
            ->withCount('assignedCustomers');

        if ($kiosId) {
            $query->where('kios_id', $kiosId);
        }

        return $query->get();
    }
}
