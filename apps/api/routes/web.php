<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// Fallback direct storage delivery for environments without symlink support
Route::get('/storage/{path}', function (string $path) {
    if (!Storage::disk('public')->exists($path)) {
        abort(404, 'File not found');
    }
    return response()->file(Storage::disk('public')->path($path), [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->where('path', '.*');

