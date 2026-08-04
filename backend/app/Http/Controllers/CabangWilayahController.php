<?php

namespace App\Http\Controllers;

use App\Models\CabangWilayah;
use App\Models\Kios;
use App\Repositories\CustomerRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CabangWilayahController extends Controller
{
    public function __construct(
        protected CustomerRepository $customerRepository
    ) {}

    public function index(): JsonResponse
    {
        $kios = Kios::select('kios_id', 'kios_name', 'cabang_id')
            ->orderBy('kios_id')
            ->get()
            ->groupBy('cabang_id');

        $cabangs = collect([
            ['cabang_id' => '40200', 'cabang_name' => 'Sleman 2'],
            ['cabang_id' => '43800', 'cabang_name' => 'Yogyakarta'],
        ])->map(function ($cabang) use ($kios) {
            $cabangKios = $kios->get($cabang['cabang_id'], collect());
            $wilayah = CabangWilayah::where('cabang_id', $cabang['cabang_id'])
                ->orderBy('kecamatan')
                ->orderBy('kelurahan')
                ->get();

            return [
                'cabang_id' => $cabang['cabang_id'],
                'cabang_name' => $cabang['cabang_name'],
                'kios' => $cabangKios,
                'wilayah' => $wilayah,
            ];
        });

        return response()->json(['data' => $cabangs]);
    }

    public function update(Request $request, string $cabangId): JsonResponse
    {
        $validated = $request->validate([
            'wilayah' => 'required|array',
            'wilayah.*.kabupaten_kota' => 'required|string|max:100',
            'wilayah.*.kecamatan' => 'required|string|max:100',
            'wilayah.*.kelurahan' => 'nullable|string|max:100',
            'replace' => 'sometimes|boolean',
        ]);

        // Default adalah merge: hanya menambah, TIDAK menghapus wilayah lain.
        // replace=true (dikirim UI yang selalu mengirim set penuh) melakukan full-replace.
        $replace = (bool) ($validated['replace'] ?? false);

        $newKeys = [];
        foreach ($validated['wilayah'] as $w) {
            $newKeys[] = $this->keyOf($w);
        }

        // remove wilayah that are no longer assigned
        if ($replace) {
            $existing = CabangWilayah::where('cabang_id', $cabangId)->get();
            foreach ($existing as $w) {
                if (! in_array($this->keyOf($w), $newKeys)) {
                    $w->delete();
                }
            }
        }

        // add new wilayah
        $existingNew = CabangWilayah::where('cabang_id', $cabangId)
            ->get()
            ->keyBy(fn ($w) => $this->keyOf($w));

        foreach ($validated['wilayah'] as $w) {
            if (! $existingNew->has($this->keyOf($w))) {
                CabangWilayah::create([
                    'cabang_id' => $cabangId,
                    'kabupaten_kota' => $w['kabupaten_kota'],
                    'kecamatan' => $w['kecamatan'],
                    'kelurahan' => $w['kelurahan'] ?? null,
                ]);
            }
        }

        $wilayah = CabangWilayah::where('cabang_id', $cabangId)
            ->orderBy('kecamatan')
            ->orderBy('kelurahan')
            ->get();

        $syncedCustomers = $this->customerRepository->syncCustomerCabang();

        return response()->json([
            'message' => 'Wilayah cabang diupdate',
            'data' => $wilayah,
            'synced_customers' => $syncedCustomers,
        ]);
    }

    private function keyOf(array|object $w): string
    {
        $kabupaten = $w['kabupaten_kota'] ?? $w->kabupaten_kota ?? '';
        $kecamatan = $w['kecamatan'] ?? $w->kecamatan ?? '';
        $kelurahan = $w['kelurahan'] ?? $w->kelurahan ?? null;

        return $kelurahan
            ? "{$kabupaten}::{$kecamatan}::{$kelurahan}"
            : "{$kabupaten}::{$kecamatan}";
    }
}
