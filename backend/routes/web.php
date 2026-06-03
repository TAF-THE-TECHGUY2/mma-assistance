<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| The MMA backend is an API-only application; the React/Vite frontend is
| served separately. A single informational root route is exposed here so
| that hitting the backend host directly returns something sensible.
|
*/

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'api' => '/api',
    ]);
});
